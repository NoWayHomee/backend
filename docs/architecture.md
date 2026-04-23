# 🏗️ NowayHome System Architecture

Tài liệu này mô tả kiến trúc tổng thể của hệ thống đặt phòng NowayHome (Agoda Clone), đảm bảo tính nhất quán giữa các phân hệ theo tiêu chuẩn CLO1.

## 1. Tổng quan hệ thống (System Overview)

Hệ thống được thiết kế theo mô hình **Client-Server** với kiến trúc **Monolithic API** ở giai đoạn đầu, sẵn sàng cho việc mở rộng.

- **Mobile App (Customer):** React Native + Expo.
- **Web App (Partner/Admin):** React.js + Vite.
- **Backend (Core):** Node.js + Express.js.
- **Database:** MySQL.

## 2. Mô hình phân tầng (Layered Architecture)

Backend áp dụng mô hình **Controller - Service - Repository** để tách biệt nghiệp vụ:

- **Routes Layer:** Tiếp nhận Request từ FE.
- **Controllers:** Điều phối luồng và validate đầu vào.
- **Services:** Chứa logic nghiệp vụ (Tính giá, check overbooking, áp dụng voucher).
- **Models/Repositories:** Thao tác trực tiếp với MySQL (Sequelize/Pool).

## 3. Luồng tích hợp (Integration Flow)

1. **Authentication (JWT):**
   - FE gửi thông tin đăng nhập -> BE xác thực -> Trả về JWT (Access & Refresh Token).
   - FE lưu Token vào `SecureStore` (Mobile) hoặc `Cookies` (Web).
   - Mọi request sau đó đều đính kèm `Bearer Token` ở Header.

2. **Booking & Transaction (Mục 9.1 report.pdf):**
   - Khi tạo đơn, BE khởi tạo `START TRANSACTION`.
   - Sử dụng `SELECT ... FOR UPDATE` trên bảng `daily_rates` để khóa hàng đợi, tránh Race Condition/Overbooking.

3. **Media Management:**
   - Ảnh được lưu trữ trên Cloud Storage (Cloudinary/S3). Database chỉ lưu URL và Metadata.

## 4. Cấu trúc thư mục chuẩn (Proposed Structure)

### Backend

- `/src/controllers`: Xử lý logic API.
- `/src/services`: Logic nghiệp vụ lõi.
- `/src/middlewares`: Auth, Error Handler.
- `/src/config`: Database connection, JWT secret.

### Mobile App

- `/app`: Expo Router (tabs/stack).
- `/src/components`: UI components (themed).
- `/src/services/api`: Axios instance & API calls.
- `/src/store`: Zustand state management.
