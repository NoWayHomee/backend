# 📄 NoWayHome Database Schema Specification (v3.8)

**Mục đích:** Tài liệu đặc tả cấu trúc dữ liệu cốt lõi, đóng vai trò là "Bản thiết kế chuẩn" để khởi tạo các TypeORM Entities hỗ trợ PostgreSQL.
**Cấu trúc:** Tối ưu hóa các kiểu dữ liệu, các ràng buộc toàn vẹn (Constraints), khóa ngoại (Foreign Keys) và chỉ mục (Indexes).

---

## 🏗️ 1. Phân hệ Người dùng & Xác thực (Identity & Access)

### Bảng: `users`

Lưu trữ danh tính cốt lõi của toàn bộ hệ thống.

- **Constraints:** `chk_email_not_empty` (email <> ''), `chk_phone_format` (phone IS NULL OR phone <> '')
- **Indexes:** `uq_users_uuid`, `uq_users_email`, `uq_users_phone`, `idx_users_type_status`, `idx_users_status`

| Field                | Type         | Attributes        | Description / Notes                         |
| :------------------- | :----------- | :---------------- | :------------------------------------------ |
| `id`                 | BIGINT       | PK, Auto Inc      |                                             |
| `uuid`               | CHAR(36)     | Unique, Not Null  | Dùng cho Public API                         |
| `email`              | VARCHAR(255) | Unique, Not Null  |                                             |
| `phone`              | VARCHAR(20)  | Unique            |                                             |
| `password_hash`      | VARCHAR(255) |                   |                                             |
| `full_name`          | VARCHAR(255) | Not Null          |                                             |
| `avatar_url`         | VARCHAR(500) |                   |                                             |
| `user_type`          | ENUM         | Not Null          | 'customer', 'partner', 'staff'              |
| `status`             | ENUM         | Default 'pending' | 'active', 'suspended', 'pending', 'deleted' |
| `email_verified_at`  | DATETIME     |                   |                                             |
| `last_login_at`      | DATETIME     |                   |                                             |
| `preferred_language` | CHAR(5)      | Default 'vi'      |                                             |

### Bảng: `social_accounts`

| Field              | Type         | Attributes      | Description / Notes                   |
| :----------------- | :----------- | :-------------- | :------------------------------------ |
| `id`               | BIGINT       | PK, Auto Inc    |                                       |
| `user_id`          | BIGINT       | FK -> users(id) | ON DELETE RESTRICT                    |
| `provider`         | ENUM         | Not Null        | 'google', 'facebook', 'apple', 'zalo' |
| `provider_id`      | VARCHAR(255) | Not Null        | Unique cùng với `provider`            |
| `access_token`     | TEXT         |                 |                                       |
| `refresh_token`    | TEXT         |                 |                                       |
| `token_expires_at` | DATETIME     |                 |                                       |

### Bảng: `partner_profiles`

| Field                 | Type         | Attributes              | Description / Notes               |
| :-------------------- | :----------- | :---------------------- | :-------------------------------- |
| `id`                  | BIGINT       | PK, Auto Inc            |                                   |
| `user_id`             | BIGINT       | FK -> users(id), Unique | ON DELETE RESTRICT                |
| `business_name`       | VARCHAR(255) | Not Null                |                                   |
| `business_type`       | ENUM         | Not Null                | 'individual', 'company'           |
| `tax_code`            | VARCHAR(50)  |                         |                                   |
| `id_card_number`      | VARCHAR(50)  |                         |                                   |
| `contract_url`        | VARCHAR(500) |                         |                                   |
| `kyc_status`          | ENUM         | Default 'pending'       | 'pending', 'approved', 'rejected' |
| `kyc_reviewed_by`     | BIGINT       | FK -> users(id)         | ON DELETE SET NULL                |
| `kyc_reviewed_at`     | DATETIME     |                         |                                   |
| `bank_account_name`   | VARCHAR(255) |                         |                                   |
| `bank_account_number` | VARCHAR(100) |                         |                                   |
| `bank_name`           | VARCHAR(100) |                         |                                   |
| `commission_tier`     | VARCHAR(50)  | Default 'standard'      |                                   |

### Bảng: `customer_profiles`

| Field                    | Type        | Attributes              | Description / Notes                    |
| :----------------------- | :---------- | :---------------------- | :------------------------------------- |
| `id`                     | BIGINT      | PK, Auto Inc            |                                        |
| `user_id`                | BIGINT      | FK -> users(id), Unique | ON DELETE RESTRICT                     |
| `date_of_birth`          | DATE        |                         |                                        |
| `gender`                 | ENUM        |                         | 'male', 'female', 'other'              |
| `nationality`            | CHAR(2)     |                         |                                        |
| `id_card_number`         | VARCHAR(50) |                         |                                        |
| `loyalty_tier`           | ENUM        | Default 'member'        | 'member', 'silver', 'gold', 'platinum' |
| `loyalty_points_balance` | INT         | Default 0               |                                        |
| `total_bookings`         | INT         | Default 0               |                                        |

### Bảng: `staff_profiles`

| Field           | Type         | Attributes               | Description / Notes                                                                   |
| :-------------- | :----------- | :----------------------- | :------------------------------------------------------------------------------------ |
| `id`            | BIGINT       | PK, Auto Inc             |                                                                                       |
| `user_id`       | BIGINT       | FK -> users(id), Unique  | ON DELETE CASCADE                                                                     |
| `employee_code` | VARCHAR(50)  | Unique, Not Null         |                                                                                       |
| `department`    | ENUM         | Not Null                 | 'engineering', 'customer_service', 'finance', 'operations', 'marketing', 'management' |
| `job_title`     | VARCHAR(200) | Not Null                 |                                                                                       |
| `region_scope`  | VARCHAR(200) |                          |                                                                                       |
| `city_scope`    | JSON         |                          |                                                                                       |
| `manager_id`    | BIGINT       | FK -> staff_profiles(id) | ON DELETE SET NULL                                                                    |
| `joined_at`     | DATE         |                          |                                                                                       |
| `is_active`     | BOOLEAN      | Default 1                |                                                                                       |

### Hệ thống Phiên & Mã xác thực (`otp_tokens`, `user_sessions`)

- **`otp_tokens`**: `identifier`, `identifier_type` ('email', 'phone'), `purpose`, `token_hash`, `expires_at`, `attempts`.
- **`user_sessions`**: `user_id`, `token_hash` (Unique), `device_type`, `expires_at`, `revoked_at`.

---

## 🏨 2. Phân hệ Chỗ nghỉ (Property & Inventory)

### Bảng: `properties`

- **Constraints:** `chk_star_rating` (1 to 5)
- **Indexes:** `uq_property_slug`, `idx_prop_partner`, `idx_prop_search`, `idx_prop_rating`, `idx_prop_location`

| Field            | Type          | Attributes                 | Description / Notes                                           |
| :--------------- | :------------ | :------------------------- | :------------------------------------------------------------ |
| `id`             | BIGINT        | PK, Auto Inc               |                                                               |
| `partner_id`     | BIGINT        | FK -> partner_profiles(id) |                                                               |
| `slug`           | VARCHAR(300)  | Unique, Not Null           |                                                               |
| `name`           | VARCHAR(500)  | Not Null                   |                                                               |
| `property_type`  | ENUM          | Not Null                   | 'hotel', 'homestay', 'resort', 'apartment', 'villa', 'hostel' |
| `description`    | TEXT          |                            |                                                               |
| `address`        | TEXT          | Not Null                   |                                                               |
| `city`           | VARCHAR(100)  | Not Null                   |                                                               |
| `district`       | VARCHAR(100)  |                            |                                                               |
| `country_code`   | CHAR(2)       | Default 'VN'               |                                                               |
| `latitude`       | DECIMAL(10,8) | Not Null                   |                                                               |
| `longitude`      | DECIMAL(11,8) | Not Null                   |                                                               |
| `star_rating`    | TINYINT       |                            |                                                               |
| `avg_rating`     | DECIMAL(3,2)  | Default 0.00               |                                                               |
| `total_reviews`  | INT           | Default 0                  |                                                               |
| `check_in_time`  | TIME          | Default '14:00:00'         |                                                               |
| `check_out_time` | TIME          | Default '12:00:00'         |                                                               |
| `status`         | ENUM          | Default 'draft'            | 'draft', 'pending_review', 'active', 'suspended'              |

### Bảng: `property_policies` (Đã gộp toàn bộ bản cập nhật mở rộng)

| Field                              | Type          | Attributes                   | Description / Notes                                        |
| :--------------------------------- | :------------ | :--------------------------- | :--------------------------------------------------------- |
| `id`                               | BIGINT        | PK, Auto Inc                 |                                                            |
| `property_id`                      | BIGINT        | FK -> properties(id), Unique | ON DELETE CASCADE                                          |
| **--- Chính sách Hủy ---**         |               |                              |                                                            |
| `cancellation_type`                | ENUM          | Default 'flexible'           | 'free', 'flexible', 'moderate', 'strict', 'non_refundable' |
| `free_cancel_hours`                | SMALLINT      |                              |                                                            |
| `cancel_penalty_percent`           | DECIMAL(5,2)  | Default 0.00                 |                                                            |
| **--- Check-in / Check-out ---**   |               |                              |                                                            |
| `min_stay_nights`                  | TINYINT       | Default 1                    |                                                            |
| `max_stay_nights`                  | TINYINT       |                              |                                                            |
| `check_in_from`                    | TIME          | Default '14:00:00'           |                                                            |
| `check_in_until`                   | TIME          | Default '22:00:00'           |                                                            |
| `check_out_from`                   | TIME          | Default '00:00:00'           |                                                            |
| `check_out_until`                  | TIME          | Default '12:00:00'           |                                                            |
| `early_check_in_allowed`           | BOOLEAN       | Default 0                    |                                                            |
| `early_check_in_fee`               | DECIMAL(12,2) |                              |                                                            |
| `late_check_out_allowed`           | BOOLEAN       | Default 0                    |                                                            |
| `late_check_out_fee`               | DECIMAL(12,2) |                              |                                                            |
| **--- Trẻ em & Giường phụ ---**    |               |                              |                                                            |
| `children_allowed`                 | BOOLEAN       | Default 1                    |                                                            |
| `min_child_age`                    | TINYINT       | Default 0                    |                                                            |
| `infant_0_4_fee`                   | DECIMAL(12,2) | Default 0.00                 |                                                            |
| `free_baby_cot`                    | BOOLEAN       | Default 0                    |                                                            |
| `child_5_11_fee`                   | DECIMAL(12,2) | Default 0.00                 |                                                            |
| `child_5_11_must_use_extra_bed`    | BOOLEAN       | Default 0                    |                                                            |
| `extra_bed_available`              | BOOLEAN       | Default 0                    |                                                            |
| `extra_bed_charge`                 | DECIMAL(12,2) |                              |                                                            |
| `extra_person_fee`                 | DECIMAL(12,2) |                              |                                                            |
| **--- Đặt phòng & Thanh toán ---** |               |                              |                                                            |
| `instant_confirmation`             | BOOLEAN       | Default 1                    | 1: Tự duyệt, 0: Host duyệt                                 |
| `deposit_required`                 | BOOLEAN       | Default 0                    |                                                            |
| `deposit_type`                     | ENUM          |                              | 'percent', 'fixed_amount'                                  |
| `deposit_value`                    | DECIMAL(12,2) |                              |                                                            |
| `deposit_days_before`              | SMALLINT      |                              |                                                            |
| `accepted_payment_methods`         | JSON          |                              | e.g. ["cash", "credit_card"]                               |
| `no_show_penalty_type`             | ENUM          | Default 'full_amount'        | 'full_amount', 'first_night', 'percent'                    |
| `no_show_penalty_value`            | DECIMAL(12,2) |                              |                                                            |
| **--- Tiện ích tính phí ---**      |               |                              |                                                            |
| `wifi_fee`                         | DECIMAL(12,2) | Default 0.00                 |                                                            |
| `breakfast_included`               | BOOLEAN       | Default 0                    |                                                            |
| `breakfast_fee`                    | DECIMAL(12,2) |                              |                                                            |
| `airport_shuttle_available`        | BOOLEAN       | Default 0                    |                                                            |
| `airport_shuttle_fee`              | DECIMAL(12,2) |                              |                                                            |
| `parking_type`                     | ENUM          | Default 'none'               | 'free', 'paid', 'none'                                     |
| `parking_fee`                      | DECIMAL(12,2) |                              |                                                            |
| **--- Quy định (House Rules) ---** |               |                              |                                                            |
| `pets_allowed`                     | BOOLEAN       | Default 0                    |                                                            |
| `pet_fee`                          | DECIMAL(12,2) |                              |                                                            |
| `pet_max_weight_kg`                | DECIMAL(5,2)  |                              |                                                            |
| `smoking_allowed`                  | BOOLEAN       | Default 0                    |                                                            |
| `smoking_penalty`                  | DECIMAL(12,2) |                              |                                                            |
| `parties_allowed`                  | BOOLEAN       | Default 0                    |                                                            |
| `quiet_hours_start`                | TIME          |                              |                                                            |
| `quiet_hours_end`                  | TIME          |                              |                                                            |
| `requires_marriage_certificate`    | BOOLEAN       | Default 0                    |                                                            |
| **--- Rủi ro & Bồi thường ---**    |               |                              |                                                            |
| `damage_deposit_required`          | BOOLEAN       | Default 0                    |                                                            |
| `damage_deposit_amount`            | DECIMAL(12,2) |                              |                                                            |
| `liability_waiver`                 | TEXT          |                              |                                                            |
| `force_majeure_policy`             | TEXT          |                              |                                                            |

### Bảng: `room_types` & `rooms`

- **`room_types`**: Cấu hình chung cho loại phòng (`base_price`, `max_occupancy`, `total_rooms`).
- **`rooms`**: Các phòng thực tế vật lý (`room_number`, `status` ENUM available/occupied/blocked/maintenance). Unique constraint: `property_id` + `room_number`.

### Bảng: Phụ trợ Property

- **`amenities`**, **`property_amenities`**, **`room_type_amenities`**: Quản lý tiện ích (Many-to-Many).
- **`property_media`**: Hình ảnh/Video. Khóa ngoại trỏ đến `properties` hoặc `room_types`. Phân loại `category` (exterior, interior, pool...).

---

## 📅 3. Giá & Khuyến mãi (Pricing & Promotions)

- **`rate_plans`**: Gói giá (VD: Giá kèm bữa sáng, Không hoàn hủy). `meal_plan` ENUM ('room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive').
- **`daily_rates`**: Giá tùy chỉnh theo từng ngày của Rate Plan. Có Constraint: `chk_daily_rate_price` (price >= 0). Unique: `rate_plan_id` + `date`.
- **`promotions`**: Cấu hình giảm giá (phần trăm/cố định, min_order_amount).
- **`vouchers`**: Mã coupon cấp từ Promotion.
- **`voucher_usages`**: Lịch sử áp mã của khách, lưu `discount_applied`. Unique `voucher_id` + `booking_id`.

---

## 🛒 4. Đặt phòng & Giao dịch (Bookings & Payments)

### Bảng: `bookings`

- **Constraints:** \* `chk_booking_dates` (check_in_date < check_out_date)
  - `chk_booking_nights` (num_nights = DATEDIFF(check_out_date, check_in_date))
  - `chk_booking_total` (total_amount >= 0)

| Field                   | Type          | Attributes           | Description / Notes                                                         |
| :---------------------- | :------------ | :------------------- | :-------------------------------------------------------------------------- |
| `id`                    | BIGINT        | PK, Auto Inc         |                                                                             |
| `booking_code`          | VARCHAR(30)   | Unique, Not Null     |                                                                             |
| `customer_id`           | BIGINT        | FK -> users(id)      |                                                                             |
| `property_id`           | BIGINT        | FK -> properties(id) |                                                                             |
| `check_in_date`         | DATE          | Not Null             |                                                                             |
| `check_out_date`        | DATE          | Not Null             |                                                                             |
| `num_nights`            | TINYINT       | Not Null             |                                                                             |
| `num_adults`            | TINYINT       | Default 1            |                                                                             |
| `num_children`          | TINYINT       | Default 0            |                                                                             |
| `subtotal_amount`       | DECIMAL(12,2) | Not Null             |                                                                             |
| `discount_amount`       | DECIMAL(12,2) | Default 0.00         |                                                                             |
| `tax_amount`            | DECIMAL(12,2) | Default 0.00         |                                                                             |
| `total_amount`          | DECIMAL(12,2) | Not Null             |                                                                             |
| `platform_fee_amount`   | DECIMAL(12,2) | Default 0.00         |                                                                             |
| `partner_payout_amount` | DECIMAL(12,2) | Default 0.00         |                                                                             |
| `voucher_id`            | BIGINT        | FK -> vouchers(id)   | ON DELETE SET NULL                                                          |
| `status`                | ENUM          | Default 'pending'    | 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show' |
| `payment_status`        | ENUM          | Default 'unpaid'     | 'unpaid', 'partial', 'paid', 'refunded'                                     |

### Các bảng chi tiết Booking

- **`booking_rooms`**: Liên kết 1 booking với nhiều phòng vật lý + gói giá.
- **`booking_guests`**: Thông tin người nhận phòng (hỗ trợ nhập nhiều người ngoài người đặt).
- **`booking_fees`**: Lưu chi tiết các khoản phí (VAT, Service fee, Platform fee) và đối tượng chịu phí (customer / partner).

### Bảng: `payments` & `refunds`

- **`payments`**: `amount` (Constraint > 0), `payment_method`, `gateway`, `status` ('pending','success','failed','cancelled').
  - **Indexes:** `uq_pay_ref`, `idx_pay_status_method`, `idx_pay_created`.
- **`refunds`**: Gắn với `payment_id`, quản lý luồng hoàn tiền.

---

## 💰 5. Doanh thu Đối tác & Hệ thống (Payout & Configs)

- **`payout_wallets`**: Ví tiền của Partner.
- **`wallet_transactions`**: Lịch sử cộng/trừ tiền trong ví.
- **`payout_requests`**: Yêu cầu rút tiền của Partner.
- **`commission_configs`**: Cấu hình % hoa hồng thu của đối tác (theo tier, loại KS, hoặc toàn cầu).
- **`platform_fee_configs`**: Cấu hình phí dịch vụ thu của khách hàng.
- **`loyalty_point_ledger`**: Sổ cái tích/tiêu điểm thưởng của khách.

---

## 🛡️ 6. Đánh giá, Hỗ trợ & Rủi ro (Reviews, Support & Risk)

- **`reviews`** & **`review_media`** & **`review_responses`**: Quản lý đánh giá. Có `moderation_status` (pending/approved/rejected).
- **`support_tickets`** & **`ticket_messages`**: Hệ thống CSKH nội bộ (Ticketing).
- **`disputes`**: Giải quyết tranh chấp giữa Host và Khách.
- **`audit_logs`**: Lưu log thao tác hệ thống (`actor_id`, `action`, `old_values`, `new_values`).
  - **Indexes:** `idx_audit_entity`, `idx_audit_actor`, `idx_audit_created`.
- **`notifications`**: Hệ thống thông báo đa kênh.
  - **Indexes:** `idx_notif_user_read`, `idx_notif_entity`.
- **`risk_rules`** & **`risk_assessments`**: Anti-fraud system, đánh giá rủi ro booking/payment.

---

## 🔐 7. Phân quyền (RBAC - Role Based Access Control)

Hệ thống quản lý quyền chuyên sâu cho Admin/Staff.

- **`roles`**: Định nghĩa nhóm quyền (VD: SuperAdmin, CS_Manager).
- **`permissions`**: Quyền chi tiết (`action`, `resource`).
- **`role_permissions`**: Nối Role và Permission.
- **`user_roles`**: Gán Role cho User, hỗ trợ `scope_type` và `scope_value` (VD: Chỉ có quyền ở khu vực "Hà Nội").
