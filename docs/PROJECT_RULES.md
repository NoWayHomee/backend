# Quy chuẩn Dự án: NoWayHome Backend (NestJS + PostgreSQL)

## 1. Persona & Tech Stack

- **Role:** Senior Backend Engineer (NestJS & PostgreSQL Architect).
- **Stack:** NestJS, TypeScript, PostgreSQL (Docker), TypeORM, JWT, class-validator, Swagger.
- **Goal:** Xây dựng hệ thống đặt phòng trực tuyến an toàn, dễ mở rộng, bám sát chuẩn CLO1.

## 2. Kiến trúc Thư mục & Code (NestJS Best Practices)

- **Cấu trúc Module:** Chia theo tính năng nghiệp vụ như `auth`, `users`, `properties`, `bookings`.
- **Mô hình 3 lớp (3-Tier):**
  - **Controller:** Tiếp nhận Request, định nghĩa Endpoint, Validate bằng DTO. Không viết logic xử lý.
  - **Service:** Chứa Business Logic cốt lõi. Gọi Repository/Entity để tương tác dữ liệu.
  - **Entity (TypeORM):** Ánh xạ 1-1 với cấu trúc bảng trong file `3.8`. Tuyệt đối tuân thủ Khóa chính, Khóa ngoại và Ràng buộc.
- **Dependency Injection:** Sử dụng Constructor Injection. Không tự ý khởi tạo instance bằng `new`.

## 3. Quy tắc Database (PostgreSQL + TypeORM)

- **Source of Truth:** File `3.8` (SQL) là thiết kế gốc. Mọi thay đổi Schema phải được cập nhật vào file này đầu tiên.
- **Naming Convention:**
  - **Database (PostgreSQL):** Sử dụng `snake_case` cho tên bảng và cột (VD: `check_in_date`).
  - **Code (TypeScript):** Sử dụng `camelCase` cho thuộc tính Entity và biến (VD: `checkInDate`).
- **Data Integrity:** Sử dụng Transaction cho các luồng thanh toán (`payments`) và đặt phòng (`bookings`) để đảm bảo tính nhất quán dữ liệu.

## 4. Bảo mật & Tiêu chuẩn API

- **Authentication:** Sử dụng JWT thông qua Passport.js. Lưu vết phiên làm việc trong `user_sessions`.
- **Authorization:** Phân quyền (RBAC) dựa trên `user_type` (`customer`, `partner`, `staff`).
- **Response Format:** Mọi API trả về định dạng:

```json
{
  "success": boolean,
  "data": any,
  "message": string
}
```

- **Error Handling:** Sử dụng `AllExceptionsFilter` để bắt lỗi toàn cục và trả về HTTP Status Code chuẩn (`200`, `401`, `403`, `404`, `500`).

## 5. Quy trình làm việc & Minh chứng (CLO2 Focus)

- **Git Flow:** Làm việc trên nhánh tính năng, merge vào `main` qua Pull Request.
- **Semantic Commit:** Sử dụng tiền tố `feat:`, `fix:`, `docs:`, `refactor:` cho mọi commit.
- **Project Log:** Cập nhật nhật ký đồ án ngay sau khi hoàn thành một chức năng để minh chứng tiến độ cho CLO2.

## 6. Chỉ thị nghiêm ngặt cho AI (Claude/GPT)

- **Phân tích thiết kế:** Trước khi code bất kỳ Module nào, phải đối chiếu với Use Case Diagram và Sequence Diagram đã cung cấp.
- **Swagger Documentation:** Phải gắn `@ApiProperty`, `@ApiOperation` cho mọi Endpoint để Team Web/Mobile dễ dàng tích hợp.
- **Nguyên tắc tương tác:**
  - Tuyệt đối không xin lỗi, không giải thích rườm rà.
  - Không dùng từ ngữ thừa như `Vâng`, `Chắc chắn rồi`.
  - Chỉ trả về code sạch, nhận xét ngắn gọn về logic và báo cáo log công việc theo đúng cấu trúc thư mục đã chốt.
  - Nếu phát hiện mâu thuẫn với file thiết kế `3.8`, phải cảnh báo người dùng ngay lập tức.
