import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool, ensureSchema } from "./db.js";
import authRoutes from "./routes/auth.js";
import roomsRoutes from "./routes/rooms.js";
import paymentsRoutes from "./routes/payments.js";
import os from "os";

const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/api/direct-ping", (req, res) => res.json({ msg: "direct-pong" }));
app.use("/api", paymentsRoutes);
app.use("/api", authRoutes);
app.use("/api", roomsRoutes);

// Error middleware: log day du o server, chi tra ve thong bao tom tat cho client
app.use((err, _req, res, _next) => {
  console.error("[api error]", err);
  if (res.headersSent) return;
  // Khong leak SQL/stack ra client. Trong dev co the bat verbose.
  if (!isProduction && err?.message) {
    return res.status(500).json({ error: `Loi may chu: ${err.message}` });
  }
  res.status(500).json({ error: "Da co loi xay ra, vui long thu lai sau" });
});

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME || "Administrator";
  if (!email || !password) return;

  // Lấy id role 'admin' đã được khởi tạo bởi ensureSchema()
  const [roleRows] = await pool.query("SELECT id FROM roles WHERE slug='admin' LIMIT 1");
  if (!roleRows.length) {
    console.warn("[bootstrap] Role 'admin' chưa tồn tại.");
    return;
  }
  const roleId = roleRows[0].id;

  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (rows.length) {
    // Đảm bảo user hiện có cũng được gán role admin
    await pool.query(
      "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [rows[0].id, roleId]
    );
    return;
  }

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
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [r.insertId, roleId]
    );
    await conn.commit();
    console.log(`[bootstrap] Created admin ${email}`);
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

const PORT = Number(process.env.PORT || 3001);
ensureSchema()
  .then(bootstrapAdmin)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🚀 Backend API is running!`);
      console.log(`🏠 Local: http://localhost:${PORT}`);
      
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Lọc IPv4 và không phải loopback (127.0.0.1)
          if (net.family === "IPv4" && !net.internal) {
            console.log(`🌐 Network: http://${net.address}:${PORT}`);
            console.log(`📱 Mobile Web: http://${net.address}:5175`);
          }
        }
      }
      console.log("\n");
    });
  })
  .catch((e) => {
    console.error("Startup failed:", e);
    process.exit(1);
  });
