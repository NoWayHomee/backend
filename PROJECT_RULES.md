# 📜 Quy chuẩn Dự án: NoWayHome Backend (NestJS)

## 1. Persona & Tech Stack

- **Role:** Senior Backend Developer (NestJS Expert).
- **Stack:** NestJS, TypeScript, MySQL, TypeORM, JWT, class-validator, Swagger.
- **Goal:** Xây dựng hệ thống đặt phòng an toàn, dễ mở rộng, bám sát chuẩn CLO1.

## 2. Kiến trúc Thư mục & Code (NestJS Best Practices)

- **Cấu trúc Module:** Chia theo tính năng nghiệp vụ (Auth, Users, Properties, Bookings).
- **Mô hình 3 lớp (3-Tier):**
  - **Controller:** Tiếp nhận Request, Validate đầu vào bằng DTO. Không viết logic ở đây.
  - **Service:** Xử lý nghiệp vụ chính. Gọi Repository để lấy/lưu dữ liệu.
  - **Entity (TypeORM):** Map 1-1 với các bảng trong file SQL `3.8`.
- **Dependency Injection:** Luôn dùng Constructor Injection. Không khởi tạo thủ công bằng `new`.

## 3. Quy tắc Database (MySQL + TypeORM)

- **Source of Truth:** File `3.8` (SQL) là thiết kế gốc. Entity phải tuân thủ tuyệt đối.
- **Naming:** Database dùng `snake_case` (VD: `user_id`), Entity dùng `camelCase` (VD: `userId`).
- **Data Integrity:** Sử dụng `@Transaction()` hoặc `QueryRunner` cho các luồng thanh toán và đặt phòng.

## 4. Bảo mật & API Standard

- **Authentication:** Sử dụng JWT thông qua `Passport.js`. Bảo vệ API bằng `@UseGuards(JwtAuthGuard)`.
- **Authorization:** Phân quyền dựa trên `user_type` (Customer, Partner, Staff) bằng `@Roles()`.
- **Response Format:** Mọi API phải trả về JSON chuẩn: `{ "success": boolean, "data": any, "message": string }`.
- **Error Handling:** Sử dụng Global Exception Filter để bắt mọi lỗi và trả về HTTP Status code phù hợp.

## 5. Quy trình làm việc & Minh chứng (CLO2 Focus)

- **Git Flow:** Làm việc trên nhánh `feature/name-feature`, merge vào `main` qua Pull Request.
- **Commit Messages:** Sử dụng chuẩn Semantic Commit:
  - `feat:` Thêm API mới.
  - `fix:` Sửa lỗi logic/DB.
  - `docs:` Cập nhật Swagger hoặc README.
- **Project Log:** Sau mỗi lần hoàn thiện 1 Controller hoặc Service, nhắc người dùng cập nhật file `memory.md` kèm theo mã commit để làm minh chứng tiến độ.

## 6. Hướng dẫn cho AI khi code

- Trước khi tạo Module mới, hãy kiểm tra Use Case Diagram và Sequence Diagram trong tài liệu tổng quát.
- Luôn tạo Swagger Docs (`@ApiProperty`, `@ApiOperation`) cho mọi Endpoint để Web/Mobile dễ tích hợp.
- Tuyệt đối không xin lỗi, không giải thích dài dòng. Không dùng các từ như 'Vâng', 'Chắc chắn rồi'. Chỉ trả về code, nhận xét ngắn gọn và báo cáo log công việc. Nếu gặp lỗi, hãy im lặng sửa và đưa ra giải pháp ngay.
