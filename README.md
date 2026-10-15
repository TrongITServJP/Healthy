# Healthy

Ứng dụng web theo dõi sức khỏe mỗi ngày, chạy hoàn toàn bằng HTML/CSS/JavaScript, host miễn phí trên GitHub Pages.

## Tính năng

- 💧 **Nước uống** – thêm nhanh 150/250/500 ml, hoàn tác, biểu đồ 7 ngày
- 🏃 **Vận động** – ghi hoạt động, tự ước tính kcal theo cân nặng
- 😴 **Giấc ngủ** – giờ ngủ/thức, chất lượng giấc ngủ
- ⚖️ **Cân nặng & BMI** – thang BMI cho người châu Á, biểu đồ 30 lần gần nhất
- ⭐ **Điểm sức khỏe** hằng ngày, xem lại các ngày trước
- ⚙️ Tùy chỉnh mục tiêu, xuất/nhập dữ liệu JSON
- 📱 PWA: thêm vào màn hình chính, dùng được khi mất mạng, hỗ trợ chế độ tối

Dữ liệu lưu trong `localStorage` của trình duyệt trên từng thiết bị, không gửi lên máy chủ.

## Cài lên điện thoại

- **iPhone (Safari):** mở link → nút Chia sẻ → *Thêm vào MH chính*
- **Android (Chrome):** mở link → menu ⋮ → *Thêm vào màn hình chính* / *Cài đặt ứng dụng*

## Chạy thử trên máy

```bash
npx serve .
# hoặc
python -m http.server 8000
```

## Cập nhật

Sửa file → `git commit` → `git push`. GitHub Pages tự triển khai lại sau khoảng 1 phút.
Khi đổi CSS/JS, tăng số `?v=` trong `index.html` và `sw.js`, đồng thời tăng `CACHE` trong `sw.js`, để điện thoại nhận bản mới.

## Đồng bộ Google Sheets

App ghi mỗi ngày một dòng vào sheet **Nhật ký** (cân nặng, BMI, nước, vận động, giấc ngủ, buổi tập, bữa ăn, điểm…) qua một Apps Script Web App.

1. Mở Google Sheet → **Tiện ích mở rộng → Apps Script**.
2. Xóa code mẫu, dán toàn bộ [`apps-script/Code.gs`](apps-script/Code.gs). Đổi `TOKEN` thành một mã bí mật của bạn.
3. Chọn hàm `setup` → **Chạy** → cấp quyền.
4. **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**: *Thực thi với tư cách*: **Tôi**, *Ai có quyền truy cập*: **Bất kỳ ai** → Triển khai, sao chép URL `/exec`.
5. Trong app: **⚙️ Cài đặt → Google Sheets** → dán URL + mã bảo mật → **Lưu & kiểm tra kết nối**.

URL và mã bảo mật chỉ lưu trên thiết bị, không có trong repo. Làm bước 5 trên từng thiết bị muốn đồng bộ.
