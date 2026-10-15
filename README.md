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
Khi đổi file, tăng `CACHE` trong `sw.js` (ví dụ `healthy-v2`) để điện thoại nhận bản mới.
