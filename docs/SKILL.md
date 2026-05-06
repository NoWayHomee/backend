# Kỹ năng Lập trình Backend (NestJS + PostgreSQL)

Tập trung tuyệt đối vào tính toàn vẹn dữ liệu (Data Integrity) và tính minh bạch của logic để phục vụ bảo vệ đồ án.

## 1. Sử dụng Decorators và NestJS Standard

- **Framework Agnostic:** Ưu tiên sử dụng `@Get()`, `@Post()`, `@Body()`, `@Param()`, và `@Query()`. Tránh lạm dụng `@Req()` hoặc `@Res()` để giữ cho mã nguồn dễ kiểm thử (Test Case) và không bị phụ thuộc vào Express.
- **Security Decorators:** Sử dụng `@UseGuards(JwtAuthGuard)` cho các vùng cần bảo mật và `@Roles()` để phân quyền dựa trên `user_type` (`customer`, `partner`, `staff`).
- **Custom Decorators:** Sử dụng `@CurrentUser()` (tự viết) để trích xuất thông tin người dùng từ Token một cách an toàn và tường minh.

## 2. Làm chủ TypeORM và PostgreSQL

- **Repository Pattern:** Sử dụng Repository API cho các truy vấn cơ bản. Đối với các logic tìm kiếm phòng phức tạp hoặc báo cáo doanh thu, bắt buộc sử dụng `QueryBuilder` để tối ưu hiệu năng.
- **Giao dịch (Transactions):** **BẮT BUỘC** sử dụng Transaction cho các luồng nghiệp vụ tác động đa bảng:
  - Luồng đặt phòng: `bookings` + `booking_rooms` + `payments`.
  - Luồng hoàn tiền: `refunds` + `payments` + `wallet_transactions`.
- **Schema Control:** Tuyệt đối không dùng `synchronize: true` trên môi trường Production. Mọi thay đổi cấu trúc phải khớp với file thiết kế `3.8`.

## 3. Chống dữ liệu rác bằng DTO và Validation

- **Data Transfer Object (DTO):** 100% Request gửi lên phải có DTO tương ứng. Sử dụng `class-validator` (`@IsEmail()`, `@IsUUID()`, `@Min()`, `@Max()`) để lọc dữ liệu ngay từ tầng Controller.
- **Transformation:** Sử dụng `@Type()` từ `class-transformer` để chuyển đổi kiểu dữ liệu (VD: `string` sang `number` cho các tham số phân trang).
- **Sanitization:** Đảm bảo dữ liệu gửi lên không chứa các ký tự gây hại hoặc phá vỡ định dạng PostgreSQL.

## 4. Triết lý "Code để giải thích" (Survival Mode)

- **Code Tường Minh (Explicit):** Tuyệt đối không dùng One-liners hoặc "Magic code". Mọi đoạn code phải đơn giản đến mức sinh viên có thể giải thích từng dòng logic trước Hội đồng bảo vệ (CLO1).
- **Ưu tiên Luồng Nghiệp vụ:** Code phải bám sát các Sequence Diagram (Sơ đồ tuần tự). Nếu logic code khác với sơ đồ, phải cập nhật sơ đồ hoặc sửa code ngay lập tức để đảm bảo tính nhất quán.
- **Hạn chế Trừu tượng hóa:** Không tự ý tạo `BaseService` hay `BaseRepository` quá sớm. Hãy tập trung code chạy đúng logic nghiệp vụ của từng Module trước khi nghĩ đến việc tối ưu hóa cấu trúc (Keep It Simple, Stupid - KISS).
