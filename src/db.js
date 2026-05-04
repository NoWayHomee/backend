import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "agoda_clone",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function hasColumn(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT 1
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function hasIndex(tableName, indexName) {
  const [rows] = await pool.query(
    `SELECT 1
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (await hasColumn(tableName, columnName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function addIndexIfMissing(tableName, indexName, definition) {
  if (await hasIndex(tableName, indexName)) return;
  try {
    await pool.query(`ALTER TABLE ${tableName} ADD ${definition}`);
  } catch (e) {
    console.warn(`[ensureSchema] Khong them duoc index ${indexName} tren ${tableName}: ${e?.message || e}`);
  }
}

export async function ensureSchema() {
  await pool.query("SELECT 1");

  // Keep the current simplified partner flow usable even if only 3.8.sql
  // was imported and the incremental app changes were skipped.
  await addColumnIfMissing("partner_profiles", "reject_reason", "TEXT NULL AFTER kyc_status");

  await pool.query(
    `ALTER TABLE properties
       MODIFY COLUMN property_type VARCHAR(100) NOT NULL,
       MODIFY COLUMN status ENUM('draft','pending_review','active','suspended','rejected')
         NOT NULL DEFAULT 'pending_review'`
  );

  await addColumnIfMissing("properties", "area_sqm", "DECIMAL(6,2) NULL AFTER longitude");
  await addColumnIfMissing("properties", "capacity", "TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER area_sqm");
  await addColumnIfMissing("properties", "reject_reason", "TEXT NULL AFTER status");
  await addColumnIfMissing("properties", "platform_fee_pct", "TINYINT UNSIGNED NOT NULL DEFAULT 10");
  await addColumnIfMissing("properties", "promotion_pct", "TINYINT UNSIGNED NOT NULL DEFAULT 0");
  await addColumnIfMissing("properties", "amenities_json", "JSON NULL");
  await addColumnIfMissing("properties", "highlights_json", "JSON NULL");
  await addColumnIfMissing("properties", "transport_connections_json", "JSON NULL");

  // Bao dam slug khach san khong trung — neu DB co duplicate, log canh bao thay vi ngay
  await addIndexIfMissing("properties", "uq_properties_slug", "UNIQUE KEY uq_properties_slug (slug)");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS property_pricing (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      property_id BIGINT UNSIGNED NOT NULL,
      label VARCHAR(64) NOT NULL,
      price_per_night DECIMAL(12,2) NOT NULL,
      sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uq_property_label (property_id, label),
      KEY idx_pricing_property (property_id),
      CONSTRAINT fk_pricing_property FOREIGN KEY (property_id)
        REFERENCES properties (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // Cac cot bo sung cho hang phong (truoc day bi vut bo khi luu)
  await addColumnIfMissing("property_pricing", "area_sqm", "DECIMAL(6,2) NULL AFTER price_per_night");
  await addColumnIfMissing("property_pricing", "capacity", "TINYINT UNSIGNED NULL AFTER area_sqm");
  await addColumnIfMissing("property_pricing", "bed_info", "VARCHAR(255) NULL AFTER capacity");
  await addColumnIfMissing("property_pricing", "amenities", "TEXT NULL AFTER bed_info");
  await addColumnIfMissing("property_pricing", "image_urls_json", "JSON NULL AFTER amenities");
  await addColumnIfMissing("bookings", "price_label", "VARCHAR(64) NULL AFTER property_id");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS property_nearby_places (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      property_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(64) NOT NULL,
      distance_m INT UNSIGNED NOT NULL,
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_nearby_property (property_id),
      CONSTRAINT fk_nearby_property FOREIGN KEY (property_id)
        REFERENCES properties (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS property_gallery_images (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      property_id BIGINT UNSIGNED NOT NULL,
      category VARCHAR(64) NOT NULL,
      image_url MEDIUMTEXT NOT NULL,
      caption VARCHAR(255) NULL,
      sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_property_gallery_images_property (property_id, sort_order),
      CONSTRAINT fk_property_gallery_images_property FOREIGN KEY (property_id)
        REFERENCES properties (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await pool.query("ALTER TABLE property_gallery_images MODIFY COLUMN image_url MEDIUMTEXT NOT NULL");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS property_policies (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      property_id BIGINT UNSIGNED NOT NULL,
      cancellation_type ENUM('free','flexible','moderate','strict','non_refundable')
        NOT NULL DEFAULT 'flexible',
      free_cancel_hours SMALLINT UNSIGNED NULL,
      cancellation_policy_text TEXT NULL,
      check_in_from TIME NOT NULL DEFAULT '14:00:00',
      check_in_until TIME NOT NULL DEFAULT '23:59:00',
      check_out_until TIME NOT NULL DEFAULT '12:00:00',
      pets_allowed TINYINT(1) NOT NULL DEFAULT 0,
      smoking_allowed TINYINT(1) NOT NULL DEFAULT 0,
      children_allowed TINYINT(1) NOT NULL DEFAULT 1,
      children_free_age TINYINT UNSIGNED NULL,
      custom_rules TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_property_policies_property (property_id),
      CONSTRAINT fk_property_policies_property FOREIGN KEY (property_id)
        REFERENCES properties (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await addColumnIfMissing("property_policies", "children_free_age", "TINYINT UNSIGNED NULL");
  await addColumnIfMissing("property_policies", "cancellation_policy_text", "TEXT NULL");

  // Bao dam UNIQUE tren property_id cho ON DUPLICATE KEY UPDATE hoat dong dung
  await addIndexIfMissing("property_policies", "uq_property_policies_property", "UNIQUE KEY uq_property_policies_property (property_id)");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS property_change_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      property_id BIGINT UNSIGNED NOT NULL,
      partner_id BIGINT UNSIGNED NOT NULL,
      action_type ENUM('update','delete') NOT NULL,
      payload_json JSON NULL,
      requested_by BIGINT UNSIGNED NOT NULL,
      status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
      review_note TEXT NULL,
      reviewed_by BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_property_change_requests_property (property_id, status),
      KEY idx_property_change_requests_partner (partner_id, status),
      CONSTRAINT fk_pcr_property FOREIGN KEY (property_id)
        REFERENCES properties (id) ON DELETE CASCADE,
      CONSTRAINT fk_pcr_partner FOREIGN KEY (partner_id)
        REFERENCES partner_profiles (id) ON DELETE CASCADE,
      CONSTRAINT fk_pcr_requested_by FOREIGN KEY (requested_by)
        REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_pcr_reviewed_by FOREIGN KEY (reviewed_by)
        REFERENCES users (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      type VARCHAR(100) NOT NULL,
      channel ENUM('in_app','email','sms','push') NOT NULL DEFAULT 'in_app',
      title VARCHAR(500) NOT NULL,
      body TEXT NULL,
      data JSON NULL,
      entity_type VARCHAR(50) NULL,
      entity_id BIGINT UNSIGNED NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      read_at DATETIME NULL,
      sent_at DATETIME NULL,
      failed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notifications_user_read (user_id, is_read, created_at),
      KEY idx_notifications_entity (entity_type, entity_id),
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS mock_payment_otps (
      booking_id BIGINT UNSIGNED NOT NULL,
      otp VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      PRIMARY KEY (booking_id),
      CONSTRAINT fk_mpo_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await addColumnIfMissing("property_pricing", "total_inventory", "INTEGER DEFAULT 1");

  // 1. Khoi tao Role Admin neu chua co (tu themcode.sql)
  await pool.query(`
    INSERT INTO roles (name, slug, description, is_system)
    VALUES ('Administrator', 'admin', 'Quản trị viên hệ thống', 1)
    ON DUPLICATE KEY UPDATE description = VALUES(description)
  `);

  // 2. Don dep user_roles trung lap (tu themcode.sql)
  await pool.query(`
    DELETE FROM user_roles
    WHERE id IN (
      SELECT id FROM (
        SELECT ur1.id
        FROM user_roles ur1
        JOIN user_roles ur2 ON ur1.user_id = ur2.user_id
          AND ur1.role_id = ur2.role_id
          AND (ur1.scope_type IS NULL AND ur2.scope_type IS NULL)
          AND (ur1.scope_value IS NULL AND ur2.scope_value IS NULL)
          AND ur1.id > ur2.id
      ) x
    )
  `);
}
