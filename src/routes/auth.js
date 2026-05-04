import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { notifyAdmins, createNotification } from "../utils/notifications.js";

const router = Router();

const isProduction = process.env.NODE_ENV === "production";
const COOKIE = "session";

// ===== SESSION_SECRET — bat buoc trong production =====
const RAW_SECRET = process.env.SESSION_SECRET;
if (!RAW_SECRET && isProduction) {
  throw new Error("SESSION_SECRET la bat buoc khi NODE_ENV=production");
}
if (!RAW_SECRET) {
  console.warn("[auth] CANH BAO: SESSION_SECRET chua duoc dat — dang dung secret tam thoi cho dev");
}
const SECRET = RAW_SECRET || "dev-only-secret-change-me";

// ===== Cookie session (HMAC, timing-safe) =====
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  let expBuf, sigBuf;
  try {
    expBuf = Buffer.from(expected, "base64url");
    sigBuf = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (expBuf.length !== sigBuf.length) return null;
  try {
    if (!crypto.timingSafeEqual(expBuf, sigBuf)) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

function setCookie(res, userId, role) {
  res.cookie(COOKIE, sign({ userId, role }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure: isProduction });
}

// ===== Email validation =====
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());
}

// ===== Brute-force protection (in-memory) =====
const loginAttempts = new Map(); // key -> { count, lockedUntil }
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
function loginKey(req, email) {
  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.ip || "unknown";
  return `${ip}|${String(email || "").toLowerCase()}`;
}
function checkLoginLock(key) {
  const e = loginAttempts.get(key);
  if (!e) return 0;
  const now = Date.now();
  if (e.lockedUntil > now) return Math.ceil((e.lockedUntil - now) / 1000);
  return 0;
}
function recordLoginFailure(key) {
  const now = Date.now();
  const e = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  if (e.lockedUntil <= now) e.count = 0;
  e.count += 1;
  if (e.count >= MAX_FAILS) {
    e.lockedUntil = now + LOCK_MS;
    e.count = 0;
  }
  loginAttempts.set(key, e);
}
function resetLoginAttempts(key) {
  loginAttempts.delete(key);
}
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [k, v] of loginAttempts) {
    if (v.lockedUntil < cutoff && v.count === 0) loginAttempts.delete(k);
  }
}, 5 * 60 * 1000).unref?.();

// ===== Dummy bcrypt hash de chong timing attack khi user khong ton tai =====
let DUMMY_HASH_PROMISE = null;
function getDummyHash() {
  if (!DUMMY_HASH_PROMISE) {
    DUMMY_HASH_PROMISE = bcrypt.hash("not-a-real-password-just-timing", 10);
  }
  return DUMMY_HASH_PROMISE;
}

// ===== Helpers =====
async function hasAdminRole(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT 1 FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.slug = 'admin' LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}
async function getAdminRoleId() {
  const [rows] = await pool.query("SELECT id FROM roles WHERE slug='admin' LIMIT 1");
  if (!rows.length) throw new Error("Role 'admin' chưa được seed (kiểm tra themcode.sql)");
  return rows[0].id;
}

// ===== Verify session voi DB (chong gia mao + chong cookie cu) =====
async function loadVerifiedSession(token) {
  const s = verifyToken(token);
  if (!s || !s.userId || !s.role) return null;
  const [rows] = await pool.query(
    "SELECT id, user_type, status FROM users WHERE id = ? LIMIT 1",
    [s.userId]
  );
  const u = rows[0];
  if (!u) return null;
  if (u.status === "suspended" || u.status === "banned") return null;
  if (s.role === "admin") {
    if (u.user_type !== "staff") return null;
    if (u.status !== "active") return null;
    if (!(await hasAdminRole(u.id))) return null;
    return { userId: u.id, role: "admin" };
  }
  if (s.role === "partner") {
    if (u.user_type !== "partner") return null;
    const [pp] = await pool.query(
      "SELECT kyc_status FROM partner_profiles WHERE user_id = ? LIMIT 1",
      [u.id]
    );
    if (pp[0]?.kyc_status !== "approved") return null;
    return { userId: u.id, role: "partner" };
  }
  if (s.role === "customer") {
    if (u.user_type !== "customer") return null;
    if (u.status !== "active") return null;
    return { userId: u.id, role: "customer" };
  }
  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const s = await loadVerifiedSession(req.cookies?.[COOKIE]);
    if (!s) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Phien dang nhap khong hop le hoac da het han" });
    }
    req.session = s;
    next();
  } catch (e) { next(e); }
}
export async function requireAdmin(req, res, next) {
  try {
    const s = await loadVerifiedSession(req.cookies?.[COOKIE]);
    if (!s) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Phien dang nhap khong hop le hoac da het han" });
    }
    if (s.role !== "admin") return res.status(403).json({ error: "Khong co quyen" });
    req.session = s;
    next();
  } catch (e) { next(e); }
}
export async function requirePartner(req, res, next) {
  try {
    const s = await loadVerifiedSession(req.cookies?.[COOKIE]);
    if (!s) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Phien dang nhap khong hop le hoac da het han" });
    }
    if (s.role !== "partner") return res.status(403).json({ error: "Chi danh cho doi tac" });
    req.session = s;
    next();
  } catch (e) { next(e); }
}

// Lấy user đầy đủ (kèm role/status mapped) để trả về frontend
async function loadUserPublic(userId) {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  const u = rows[0];
  if (!u) return null;
  if (u.user_type === "staff") {
    const isAdmin = await hasAdminRole(u.id);
    if (isAdmin) return { id: u.id, email: u.email, fullName: u.full_name, role: "admin", status: "approved" };
    return { id: u.id, email: u.email, fullName: u.full_name, role: "staff", status: u.status };
  }
  if (u.user_type === "partner") {
    const [pp] = await pool.query("SELECT kyc_status FROM partner_profiles WHERE user_id = ? LIMIT 1", [u.id]);
    const kyc = pp[0]?.kyc_status || "pending";
    const status = kyc === "approved" ? "approved" : kyc === "rejected" ? "rejected" : "pending";
    return { id: u.id, email: u.email, fullName: u.full_name, role: "partner", status };
  }
  if (u.user_type === "customer") {
    return { id: u.id, email: u.email, fullName: u.full_name, phone: u.phone, role: "customer", status: u.status };
  }
  return { id: u.id, email: u.email, fullName: u.full_name, role: u.user_type, status: u.status };
}

// Pagination helper
function clampInt(value, def, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ===== Auth =====
router.post("/auth/register", async (req, res, next) => {
  const { email, password, fullName, phone, hotelName } = req.body ?? {};
  if (!email || !password || !fullName || !hotelName) {
    return res.status(400).json({ error: "Vui lòng nhập đủ email, mật khẩu, họ tên, tên khách sạn" });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
  if (String(fullName).length > 200) return res.status(400).json({ error: "Họ tên quá dài" });
  if (String(hotelName).length > 200) return res.status(400).json({ error: "Tên khách sạn quá dài" });
  if (phone && String(phone).length > 30) return res.status(400).json({ error: "Số điện thoại quá dài" });
  if (String(password).length < 8) return res.status(400).json({ error: "Mật khẩu tối thiểu 8 ký tự" });
  if (String(password).length > 200) return res.status(400).json({ error: "Mật khẩu quá dài" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [dup] = await conn.query("SELECT id FROM users WHERE email = ? FOR UPDATE", [email]);
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ error: "Email đã được đăng ký" });
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await conn.query(
      `INSERT INTO users (uuid, email, phone, password_hash, full_name, user_type, status)
       VALUES (?, ?, ?, ?, ?, 'partner', 'pending')`,
      [crypto.randomUUID(), email.trim(), phone || null, hash, fullName]
    );
    await conn.query(
      `INSERT INTO partner_profiles (user_id, business_name, business_type, kyc_status)
       VALUES (?, ?, 'individual', 'pending')`,
      [r.insertId, hotelName]
    );
    await conn.commit();
    
    // Thong bao cho admin
    await notifyAdmins({
      type: "new_partner_registration",
      title: "Doi tac moi dang ky",
      body: `Doi tac ${fullName} (${hotelName}) vua dang ky tai khoan.`,
      entityType: "partner",
      entityId: r.insertId
    });

    res.json({
      message: "Đăng ký thành công. Vui lòng chờ admin xác nhận.",
      user: { id: r.insertId, email, status: "pending" },
    });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email đã được đăng ký" });
    }
    next(e);
  } finally { conn.release(); }
});

router.post("/customer/auth/register", async (req, res, next) => {
  const { email, password, fullName, phone } = req.body ?? {};
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Vui long nhap du email, mat khau, ho ten" });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email khong hop le" });
  if (String(fullName).length > 200) return res.status(400).json({ error: "Ho ten qua dai" });
  if (phone && String(phone).length > 30) return res.status(400).json({ error: "So dien thoai qua dai" });
  if (String(password).length < 8) return res.status(400).json({ error: "Mat khau toi thieu 8 ky tu" });
  if (String(password).length > 200) return res.status(400).json({ error: "Mat khau qua dai" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [dup] = await conn.query("SELECT id FROM users WHERE email = ? FOR UPDATE", [email]);
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ error: "Email da duoc dang ky" });
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await conn.query(
      `INSERT INTO users (uuid, email, phone, password_hash, full_name, user_type, status, email_verified_at)
       VALUES (?, ?, ?, ?, ?, 'customer', 'active', NOW())`,
      [crypto.randomUUID(), email.trim(), phone || null, hash, fullName]
    );
    await conn.query("INSERT INTO customer_profiles (user_id) VALUES (?)", [r.insertId]);
    await conn.commit();

    resetLoginAttempts(loginKey(req, email));
    setCookie(res, r.insertId, "customer");
    res.json({
      user: { id: r.insertId, email, fullName, role: "customer", status: "active" },
    });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email da duoc dang ky" });
    }
    next(e);
  } finally { conn.release(); }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });

    const key = loginKey(req, email);
    const lockSec = checkLoginLock(key);
    if (lockSec > 0) {
      return res.status(429).json({ error: `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${lockSec} giây.` });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];

    // Luon chay bcrypt de tranh user enumeration timing attack
    const passwordHash = user?.password_hash || (await getDummyHash());
    const passwordOk = await bcrypt.compare(String(password), passwordHash);

    if (!user || !passwordOk) {
      recordLoginFailure(key);
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }

    // Phân loại: staff có role 'admin' → đăng nhập với role 'admin'
    if (user.user_type === "staff") {
      if (!(await hasAdminRole(user.id))) {
        recordLoginFailure(key);
        return res.status(403).json({ error: "Tài khoản không có quyền truy cập" });
      }
      if (user.status !== "active") {
        recordLoginFailure(key);
        return res.status(403).json({ error: "Tài khoản đang bị khoá" });
      }
      resetLoginAttempts(key);
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
      setCookie(res, user.id, "admin");
      return res.json({
        user: { id: user.id, email: user.email, fullName: user.full_name, role: "admin", status: "approved" },
      });
    }

    // Partner: kiểm tra KYC
    if (user.user_type === "partner") {
      const [pp] = await pool.query(
        "SELECT kyc_status, reject_reason FROM partner_profiles WHERE user_id = ? LIMIT 1",
        [user.id]
      );
      const kyc = pp[0]?.kyc_status || "pending";
      if (kyc === "pending") return res.status(403).json({ error: "Tài khoản đang chờ admin xác nhận" });
      if (kyc === "rejected") return res.status(403).json({ error: `Tài khoản bị từ chối: ${pp[0]?.reject_reason || ""}` });
      resetLoginAttempts(key);
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
      setCookie(res, user.id, "partner");
      return res.json({
        user: { id: user.id, email: user.email, fullName: user.full_name, role: "partner", status: "approved" },
      });
    }

    if (user.user_type === "customer") {
      if (user.status !== "active") {
        recordLoginFailure(key);
        return res.status(403).json({ error: "Tai khoan khach hang dang bi khoa" });
      }
      resetLoginAttempts(key);
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
      setCookie(res, user.id, "customer");
      return res.json({
        user: { id: user.id, email: user.email, fullName: user.full_name, role: "customer", status: "active" },
      });
    }

    recordLoginFailure(key);
    return res.status(403).json({ error: "Tài khoản không có quyền truy cập" });
  } catch (e) { next(e); }
});

router.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.patch("/customer/profile", requireAuth, async (req, res, next) => {
  if (req.session.role !== "customer") return res.status(403).json({ error: "Chi danh cho khach hang" });
  const { fullName, phone } = req.body ?? {};
  const sets = [], args = [];
  if (fullName !== undefined) {
    if (!String(fullName).trim()) return res.status(400).json({ error: "Ho ten khong duoc de trong" });
    if (String(fullName).length > 200) return res.status(400).json({ error: "Ho ten qua dai" });
    sets.push("full_name=?"); args.push(String(fullName).trim());
  }
  if (phone !== undefined) {
    if (phone && String(phone).length > 30) return res.status(400).json({ error: "So dien thoai qua dai" });
    sets.push("phone=?"); args.push(phone ? String(phone).trim() : null);
  }
  if (!sets.length) return res.status(400).json({ error: "Khong co thong tin cap nhat" });

  try {
    args.push(req.session.userId);
    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=?`, args);
    const user = await loadUserPublic(req.session.userId);
    res.json({ user });
  } catch (e) { next(e); }
});

router.get("/auth/me", async (req, res, next) => {
  try {
    const s = verifyToken(req.cookies?.[COOKIE]);
    if (!s) return res.json({ user: null });
    const user = await loadUserPublic(s.userId);
    if (!user) {
      clearAuthCookie(res);
      return res.json({ user: null });
    }
    res.json({ user });
  } catch (e) { next(e); }
});

// ===== Admin: quản lý partner =====
router.get("/admin/partners", requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status;
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const offset = clampInt(req.query.offset, 0, 0, 1000000);
    const args = [];
    let where = "u.user_type='partner'";
    if (status === "pending" || status === "approved" || status === "rejected") {
      where += " AND pp.kyc_status = ?"; args.push(status);
    }
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM users u LEFT JOIN partner_profiles pp ON pp.user_id = u.id
        WHERE ${where}`,
      args
    );
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name AS fullName, u.phone,
              pp.business_name AS hotelName,
              pp.kyc_status AS status,
              pp.reject_reason AS rejectReason,
              u.created_at AS createdAt,
              pp.kyc_reviewed_at AS reviewedAt,
              (SELECT COUNT(*) FROM properties p WHERE p.partner_id = pp.id) AS roomCount
         FROM users u
         LEFT JOIN partner_profiles pp ON pp.user_id = u.id
        WHERE ${where}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );
    res.json({ partners: rows, total: countRows[0].total, limit, offset });
  } catch (e) { next(e); }
});

router.get("/admin/customers", requireAdmin, async (req, res, next) => {
  try {
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const offset = clampInt(req.query.offset, 0, 0, 1000000);
    const q = String(req.query.q || "").trim();
    const args = [];
    let where = "u.user_type='customer'";
    if (q) {
      where += " AND (u.email LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)";
      const like = `%${q}%`;
      args.push(like, like, like);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM users u
        WHERE ${where}`,
      args
    );
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name AS fullName, u.phone, u.status,
              u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
              cp.loyalty_tier AS loyaltyTier,
              cp.loyalty_points_balance AS loyaltyPoints,
              COALESCE(COUNT(b.id), 0) AS bookingCount,
              COALESCE(SUM(CASE WHEN b.status <> 'cancelled' THEN b.total_amount ELSE 0 END), 0) AS totalSpent,
              COALESCE(SUM(CASE WHEN b.status IN ('confirmed','checked_in')
                      AND b.check_in_date <= CURDATE()
                      AND b.check_out_date > CURDATE()
                    THEN 1 ELSE 0 END), 0) AS activeBookingCount
         FROM users u
         LEFT JOIN customer_profiles cp ON cp.user_id = u.id
         LEFT JOIN bookings b ON b.customer_id = u.id
        WHERE ${where}
        GROUP BY u.id, u.email, u.full_name, u.phone, u.status, u.created_at,
                 u.last_login_at, cp.loyalty_tier, cp.loyalty_points_balance
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );
    res.json({
      customers: rows.map((row) => ({
        ...row,
        bookingCount: Number(row.bookingCount || 0),
        totalSpent: Number(row.totalSpent || 0),
        activeBookingCount: Number(row.activeBookingCount || 0),
        loyaltyPoints: Number(row.loyaltyPoints || 0),
      })),
      total: Number(countRows[0].total || 0),
      limit,
      offset,
    });
  } catch (e) { next(e); }
});

router.post("/admin/partners/:id/approve", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r1] = await conn.query(
      `UPDATE partner_profiles SET kyc_status='approved', reject_reason=NULL,
              kyc_reviewed_by=?, kyc_reviewed_at=NOW()
        WHERE user_id=?`,
      [req.session.userId, id]
    );
    if (!r1.affectedRows) { await conn.rollback(); return res.status(404).json({ error: "Không tìm thấy đối tác" }); }
    await conn.commit();
    await createNotification(conn, {
      userId: id,
      type: "kyc_approved",
      title: "Tai khoan doi tac da duoc duyet",
      body: "Chuc mung! Ho so doi tac cua ban da duoc chap thuan."
    });
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

// Sửa thông tin đối tác (email, họ tên, tên khách sạn, SĐT, mật khẩu)
router.patch("/admin/partners/:id", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  const { email, fullName, phone, hotelName, password } = req.body ?? {};

  const [rows] = await pool.query(
    "SELECT * FROM users WHERE id=? AND user_type='partner' LIMIT 1",
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Không tìm thấy đối tác" });
  const current = rows[0];

  const userSets = [], userArgs = [];
  if (email && email !== current.email) {
    if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    const [dup] = await pool.query("SELECT id FROM users WHERE email=? AND id<>?", [email, id]);
    if (dup.length) return res.status(409).json({ error: "Email đã tồn tại" });
    userSets.push("email=?"); userArgs.push(email);
  }
  if (fullName !== undefined && fullName !== null) {
    if (String(fullName).length > 200) return res.status(400).json({ error: "Họ tên quá dài" });
    userSets.push("full_name=?"); userArgs.push(String(fullName));
  }
  if (phone !== undefined) {
    if (phone && String(phone).length > 30) return res.status(400).json({ error: "Số điện thoại quá dài" });
    userSets.push("phone=?"); userArgs.push(phone || null);
  }
  if (password) {
    if (String(password).length < 8) return res.status(400).json({ error: "Mật khẩu tối thiểu 8 ký tự" });
    if (String(password).length > 200) return res.status(400).json({ error: "Mật khẩu quá dài" });
    userSets.push("password_hash=?"); userArgs.push(await bcrypt.hash(password, 10));
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (userSets.length) {
      userArgs.push(id);
      await conn.query(`UPDATE users SET ${userSets.join(", ")} WHERE id=?`, userArgs);
    }
    if (hotelName !== undefined && hotelName !== null) {
      if (String(hotelName).length > 200) {
        await conn.rollback();
        return res.status(400).json({ error: "Tên khách sạn quá dài" });
      }
      await conn.query(
        "UPDATE partner_profiles SET business_name=? WHERE user_id=?",
        [String(hotelName), id]
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

// Xoá đối tác (xoá luôn user → cascade xoá partner_profiles, properties, ...)
router.delete("/admin/partners/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE id=? AND user_type='partner' LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy đối tác" });
    await pool.query("DELETE FROM users WHERE id=? AND user_type='partner'", [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/admin/partners/:id/reject", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  const reason = (req.body?.reason || "").trim();
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  if (!reason) return res.status(400).json({ error: "Vui lòng nhập lý do từ chối" });
  if (reason.length > 1000) return res.status(400).json({ error: "Lý do quá dài" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r1] = await conn.query(
      `UPDATE partner_profiles SET kyc_status='rejected', reject_reason=?,
              kyc_reviewed_by=?, kyc_reviewed_at=NOW()
        WHERE user_id=?`,
      [reason, req.session.userId, id]
    );
    if (!r1.affectedRows) { await conn.rollback(); return res.status(404).json({ error: "Không tìm thấy đối tác" }); }
    await conn.query("UPDATE users SET status='suspended' WHERE id=? AND user_type='partner'", [id]);
    await conn.commit();
    await createNotification(conn, {
      userId: id,
      type: "kyc_rejected",
      title: "Ho so doi tac bi tu choi",
      body: `Rat tiec, ho so cua ban khong duoc duyet. Ly do: ${reason}`
    });
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

// ===== Admin: quản lý quản trị viên =====
router.post("/admin/admins", requireAdmin, async (req, res, next) => {
  const { email, password, fullName } = req.body ?? {};
  if (!email || !password || !fullName) return res.status(400).json({ error: "Vui lòng nhập đủ email, mật khẩu, họ tên" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
  if (String(fullName).length > 200) return res.status(400).json({ error: "Họ tên quá dài" });
  if (String(password).length < 8) return res.status(400).json({ error: "Mật khẩu tối thiểu 8 ký tự" });
  if (String(password).length > 200) return res.status(400).json({ error: "Mật khẩu quá dài" });
  const [dup] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (dup.length) return res.status(409).json({ error: "Email đã tồn tại" });
  const roleId = await getAdminRoleId();
  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO users (uuid, email, password_hash, full_name, user_type, status, email_verified_at)
       VALUES (?, ?, ?, ?, 'staff', 'active', NOW())`,
      [crypto.randomUUID(), email, hash, fullName]
    );
    await conn.query(
      "INSERT INTO user_roles (user_id, role_id, granted_by) VALUES (?, ?, ?)",
      [r.insertId, roleId, req.session.userId]
    );
    await conn.commit();
    res.json({ admin: { id: r.insertId, email, fullName } });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email đã tồn tại" });
    next(e);
  } finally { conn.release(); }
});

router.get("/admin/admins", requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name AS fullName, u.created_at AS createdAt
         FROM users u
        WHERE u.user_type='staff'
          AND EXISTS (
            SELECT 1 FROM user_roles ur
              JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = u.id AND r.slug = 'admin'
          )
        ORDER BY u.created_at DESC`
    );
    res.json({ admins: rows });
  } catch (e) { next(e); }
});

router.patch("/admin/admins/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const { email, fullName, password } = req.body ?? {};
    const [t] = await pool.query("SELECT * FROM users WHERE id=? AND user_type='staff'", [id]);
    if (!t.length || !(await hasAdminRole(id))) return res.status(404).json({ error: "Không tìm thấy admin" });
    const sets = [], args = [];
    if (email && email !== t[0].email) {
      if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
      const [dup] = await pool.query("SELECT id FROM users WHERE email=? AND id<>?", [email, id]);
      if (dup.length) return res.status(409).json({ error: "Email đã tồn tại" });
      sets.push("email=?"); args.push(email);
    }
    if (fullName) {
      if (String(fullName).length > 200) return res.status(400).json({ error: "Họ tên quá dài" });
      sets.push("full_name=?"); args.push(fullName);
    }
    if (password) {
      if (String(password).length < 8) return res.status(400).json({ error: "Mật khẩu tối thiểu 8 ký tự" });
      if (String(password).length > 200) return res.status(400).json({ error: "Mật khẩu quá dài" });
      sets.push("password_hash=?"); args.push(await bcrypt.hash(password, 10));
    }
    if (sets.length) {
      args.push(id);
      await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=?`, args);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/admin/admins/:id", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  if (id === req.session.userId) return res.status(400).json({ error: "Không thể xoá chính mình" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Khoa toan bo dong staff de chong race
    const [c] = await conn.query(
      `SELECT u.id FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
        WHERE u.user_type='staff' AND r.slug='admin'
        FOR UPDATE`
    );
    const total = c.length;
    if (total <= 1) {
      await conn.rollback();
      return res.status(400).json({ error: "Phải còn ít nhất 1 admin" });
    }
    const target = c.find((row) => row.id === id);
    if (!target) {
      await conn.rollback();
      return res.status(404).json({ error: "Không tìm thấy admin" });
    }
    await conn.query("DELETE FROM users WHERE id=? AND user_type='staff'", [id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

export default router;
