import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// Ping check
router.get("/mock-payment/ping", (req, res) => res.json({ msg: "pong" }));

// Lay thong tin thanh toan
router.get("/mock-payment/info", async (req, res) => {
  const bookingCode = req.query.bookingCode;
  if (!bookingCode) return res.status(400).json({ error: "Thieu ma dat phong" });

  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.booking_code, b.total_amount, b.payment_status, p.name as property_name
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       WHERE b.booking_code = ?`,
      [bookingCode]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Khong tim thay don hang" });
    res.json({ booking: rows[0] });
  } catch (error) {
    console.error("[mock-payment/info]", error);
    res.status(500).json({ error: `Loi may chu (info): ${error.message}` });
  }
});

// Sinh OTP ao
router.post("/mock-payment/request-otp", async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) return res.status(400).json({ error: "Thieu bookingId" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phut

  try {
    await pool.query(
      `INSERT INTO mock_payment_otps (booking_id, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [bookingId, otp, expiresAt]
    );
    res.json({ otp }); // Trong thuc te khong tra ve otp o day, nhung day la mock
  } catch (error) {
    console.error("[mock-payment/info]", error);
    res.status(500).json({ error: `Loi may chu (info): ${error.message}` });
  }
});

// Xac nhan thanh toan
router.post("/mock-payment/confirm", async (req, res) => {
  const { bookingId, otp } = req.body;
  if (!bookingId || !otp) return res.status(400).json({ error: "Thieu thong tin" });

  try {
    const [rows] = await pool.query(
      "SELECT otp FROM mock_payment_otps WHERE booking_id = ? AND expires_at > NOW()",
      [bookingId]
    );

    if (rows.length === 0 || rows[0].otp !== otp) {
      return res.status(400).json({ error: "OTP sai hoac het han" });
    }

    await pool.query(
      "UPDATE bookings SET payment_status = 'paid', status = 'confirmed' WHERE id = ?",
      [bookingId]
    );
    
    await pool.query("DELETE FROM mock_payment_otps WHERE booking_id = ?", [bookingId]);

    res.json({ success: true });
  } catch (error) {
    console.error("[mock-payment/info]", error);
    res.status(500).json({ error: `Loi may chu (info): ${error.message}` });
  }
});

// Polling trang thai (cho frontend may tinh)
router.get("/mock-payment/status/:bookingCode", async (req, res) => {
  const { bookingCode } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT payment_status FROM bookings WHERE booking_code = ?",
      [bookingCode]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ status: rows[0].payment_status });
  } catch (error) {
    console.error("[mock-payment/info]", error);
    res.status(500).json({ error: `Loi may chu (info): ${error.message}` });
  }
});

export default router;
