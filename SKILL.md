---
name: backend-coding-skills
description: Hướng dẫn lập trình Backend cho dự án này. Kích hoạt khi AI làm việc với backend NestJS, đặc biệt là các Controller, xác thực dữ liệu qua DTO, truy xuất cơ sở dữ liệu qua TypeORM/MySQL, xử lý giao dịch (transactions), và tuân thủ các quy chuẩn kiến trúc backend trong repository này.
---

# Kỹ năng Lập trình Backend

Tập trung tuyệt đối vào tính toàn vẹn dữ liệu (Data Integrity) và kiến trúc sạch (Clean Architecture).

## 1. Sử dụng Decorators của NestJS chuẩn xác

- Ưu tiên sử dụng `@Get()`, `@Post()`, `@Body()`, `@Param()`, và `@Query()`.
- Tránh sử dụng trực tiếp đối tượng `Request` của Express (thông qua `@Req()`) hoặc `Response` (thông qua `@Res()`) trừ khi có yêu cầu can thiệp đặc thù ở mức framework. Việc này giúp các Handler không bị phụ thuộc vào framework (framework-agnostic) và dễ dàng viết Test Case hơn.

## 2. Tuân thủ quy chuẩn TypeORM và MySQL

- Ưu tiên sử dụng Repository API (như `.find()` và `.save()`) cho các truy vấn tiêu chuẩn.
- Sử dụng `QueryBuilder` cho các truy vấn phức tạp hoặc logic trích xuất báo cáo thống kê.
- BẮT BUỘC sử dụng Transactions (Giao dịch) cho các thao tác ghi dữ liệu tác động lên nhiều bảng (Ví dụ: Vừa tạo đơn đặt phòng Booking, vừa lưu thông tin thanh toán Payment).
- TUYỆT ĐỐI KHÔNG kích hoạt cấu hình `synchronize: true` trong module TypeORM (để tránh làm hỏng thiết kế CSDL gốc).

## 3. Xác thực toàn bộ Payload từ Client bằng DTO

- Mọi dữ liệu đầu vào (payload) gửi đến các Route đều phải đi qua các lớp DTO.
- Sử dụng triệt để các decorators của thư viện `class-validator` như `@IsString()`, `@IsEmail()`, và `@IsOptional()`.
- Bất kỳ API nào thiếu bước xác thực dữ liệu (Validation) sẽ bị coi là một lỗ hổng bảo mật cơ bản và đánh trượt tiêu chí thiết kế.

## 4. Triết lý Thực chiến (Sinh tồn khi Bảo vệ Đồ án)

- **Viết code tường minh, dễ hiểu (Explicit):** Tuyệt đối không sử dụng các thủ thuật viết tắt (One-liners) hoặc logic lồng ghép phức tạp. Cấm lạm dụng các hàm xử lý mảng (reduce, map) lồng nhau quá sâu. Mọi đoạn code phải đủ đơn giản để sinh viên có thể giải thích logic trước hội đồng bảo vệ.
- **Không trừu tượng hóa sớm (No Premature Abstraction):** Tuyệt đối không tự ý đẻ ra các class như `BaseService`, `BaseRepository` hay `GenericController` ngay từ đầu. Chỉ tiến hành tái sử dụng (refactor) khi một đoạn logic bị lặp lại từ 3 lần trở lên. Ưu tiên số 1 là code chạy đúng luồng API.
