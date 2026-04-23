# 🗄️ NoWayHome Database Schema Reference (Full 48 Tables)

Tài liệu này là đặc tả kỹ thuật cuối cùng cho hệ thống NoWayHome, phục vụ việc phát triển API (Node.js) và ứng dụng đa nền tảng (React Native/React).

## 1. Hệ thống thực thể (Entity Groups)

### 👤 Nhóm 1: Định danh & Phân quyền (9 bảng)

Quản lý toàn bộ vòng đời người dùng và bảo mật hệ thống.

- **`users`**: Thực thể gốc lưu trữ thông tin đăng nhập và loại người dùng (`customer`, `partner`, `staff`).
- **`social_accounts`**: Liên kết tài khoản Google, Facebook, Apple, Zalo.
- **`user_sessions`**: Quản lý phiên làm việc, hỗ trợ thu hồi token (`revoked_at`).
- **`otp_tokens`**: Lưu trữ mã xác thực cho đăng ký/quên mật khẩu.
- **`roles` & **`permissions`** & **`role_permissions`\*\*: Cấu trúc RBAC cho phép phân quyền chi tiết đến từng hành động trên tài nguyên.
- **`user_roles`**: Gán vai trò cho người dùng với phạm vi hoạt động (`scope_type`, `scope_value`).
- **`staff_profiles`**: Thông tin nhân sự Admin, quản lý phạm vi thành phố/khu vực phụ trách.

### 🏨 Nhóm 2: Cơ sở lưu trú & Sản phẩm (11 bảng)

Mô tả chi tiết hạ tầng và dịch vụ cung cấp bởi Đối tác.

- **`properties`**: Thông tin chỗ nghỉ, tọa độ GPS, điểm đánh giá trung bình.
- **`property_policies`**: Chính sách hủy phòng, giờ nhận/trả phòng và quy định vật nuôi/hút thuốc.
- **`room_types`**: Định nghĩa hạng phòng (Standard, Deluxe, v.v.) và sức chứa.
- **`rooms`**: Quản lý trạng thái từng phòng vật lý (`available`, `maintenance`, v.v.).
- **`amenities`** & **`property_amenities`** & **`room_type_amenities`**: Hệ thống tiện ích đa cấp từ toàn cơ sở đến từng loại phòng.
- **`property_media`**: Kho ảnh và video chỗ nghỉ, phân loại theo khu vực (interior, exterior).
- **`rate_plans`**: Gói giá dịch vụ (ví dụ: kèm bữa sáng, không hoàn tiền).
- **`daily_rates`**: Quản lý quỹ phòng và giá biến động theo ngày (Inventory Management).
- **`wishlists`**: Danh sách yêu thích của khách hàng.

### 📅 Nhóm 3: Đặt phòng & Giao dịch (8 bảng)

Xử lý luồng nghiệp vụ chính từ lúc đặt đến lúc hoàn thành.

- **`bookings`**: Lưu mã đặt phòng (`booking_code`), tổng tiền và trạng thái đơn hàng.
- **`booking_rooms`**: Chi tiết các phòng và gói giá được chọn trong một đơn hàng.
- **`booking_guests`**: Thông tin định danh của những người lưu trú cùng.
- **`booking_fees`**: Phân tách các loại phí (VAT, phí dịch vụ, phí nền tảng).
- **`payments`** & **`refunds`**: Ghi lại lịch sử thanh toán và các giao dịch hoàn tiền qua cổng.
- **`vouchers`** & **`voucher_usages`**: Mã giảm giá và lịch sử áp dụng vào đơn hàng.

### 💰 Nhóm 4: Tài chính & Ví đối tác (3 bảng)

Quản lý dòng tiền và thanh toán cho chủ chỗ nghỉ.

- **`payout_wallets`**: Ví tiền của Đối tác, chia tách số dư khả dụng và số dư chờ xử lý.
- **`wallet_transactions`**: Nhật ký biến động số dư ví (Cộng tiền từ booking, trừ tiền rút).
- **`payout_requests`**: Yêu cầu rút tiền của Đối tác gửi lên Admin duyệt.

### 📣 Nhóm 5: Tương tác & Phản hồi (3 bảng)

- **`reviews`**: Đánh giá đa tiêu chí (sạch sẽ, vị trí, dịch vụ).
- **`review_media`**: Ảnh/video minh chứng trong bài đánh giá của khách.
- **`review_responses`**: Phản hồi chính thức từ chủ chỗ nghỉ đối với review.

### 🛠️ Nhóm 6: Hỗ trợ & Tranh chấp (3 bảng)

- **`support_tickets`** & **`ticket_messages`**: Hệ thống tin nhắn hỗ trợ nội bộ giữa người dùng và Admin.
- **`disputes`**: Xử lý tranh chấp thanh toán hoặc khiếu nại dịch vụ.

### 🛡️ Nhóm 7: Rủi ro & Kiểm soát (2 bảng)

- **`risk_rules`**: Các quy tắc phát hiện gian lận (ví dụ: thanh toán bất thường).
- **`risk_assessments`**: Kết quả đánh giá rủi ro cho từng giao dịch thanh toán.

### ⚙️ Nhóm 8: Cấu hình & Log hệ thống (9 bảng)

- **`customer_profiles`** & **`partner_profiles`**: Chứa dữ liệu nghiệp vụ quan trọng như `loyalty_tier` và `commission_tier`.
- **`commission_configs`**: Cấu hình tỷ lệ hoa hồng theo từng cấp độ đối tác hoặc loại chỗ nghỉ.
- **`platform_fee_configs`**: Cấu hình phí dịch vụ thu từ khách hàng.
- **`loyalty_point_ledger`**: Nhật ký tích/tiêu điểm thưởng của khách hàng.
- **`promotions`**: Các chiến dịch giảm giá từ phía hệ thống.
- **`audit_logs`**: Lưu vết mọi hành động thay đổi dữ liệu nhạy cảm (Ai sửa, sửa gì, lúc nào).
- **`system_configs`**: Các tham số hệ thống (Key-Value) cho phép thay đổi logic app mà không cần code lại.
- **`notifications`**: Quản lý thông báo đa kênh (In-app, Push, Email, SMS).

---

## 2. Business Logic & Integrity (Quy tắc nghiệp vụ)

| **Quy tắc**            | **Mô tả kỹ thuật**                                                                                                         |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Dòng tiền đơn hàng** | `total_amount` = `subtotal` - `discount` + `tax`. Phải khớp với tổng `fee_amount` trong `booking_fees`.                    |
| **Kiểm tra quỹ phòng** | Trước khi xác nhận `booking`, phải kiểm tra `available_qty` trong `daily_rates` cho toàn bộ khoảng ngày lưu trú.           |
| **Quy tắc bảo mật**    | Tuyệt đối không lộ `id` (Auto Increment) ra Frontend. Sử dụng `uuid` (bảng `users`) hoặc `booking_code` (bảng `bookings`). |
| **Hủy phòng**          | Logic hoàn tiền phải dựa trên `cancellation_type` và `free_cancel_hours` trong bảng `property_policies`.                   |

## 3. Lưu ý cho AI Developer

- **TypeScript Interfaces**: Cần định nghĩa `Enums` chính xác cho các trường trạng thái như `status`, `user_type` để tránh lỗi logic khi điều hướng luồng đơn hàng.
- **JSON Handling**: Các trường `gateway_response`, `old_values`/`new_values`, và `triggered_rules` chứa dữ liệu phức tạp, cần được parse cẩn thận.
- **Performance**: Luôn sử dụng các Index đã thiết kế như `idx_notif_user_read`, `idx_prop_location` trong các câu lệnh SQL để đảm bảo ứng dụng vận hành ổn định.
