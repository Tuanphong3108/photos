# 🖼️ Photos

> Ứng dụng thư viện, xem và chỉnh sửa ảnh cục bộ (Client-side), lấy cảm hứng từ **ChromeOS Gallery**, với giao diện **Material Design 3 Expressive**. Duyệt, quản lý, xem và chỉnh sửa hình ảnh ngay trên trình duyệt mà không cần tải ảnh lên máy chủ.

---

## 📸 Trải nghiệm

- 🌐 **Live App:** [Photos](https://tuanphong3108.github.io/photos/)

> ⚠️ **Lưu ý:** Photos xử lý hình ảnh trực tiếp trên thiết bị. Một số thao tác như mở thư mục, ghi đè, đổi tên hoặc xóa tệp phụ thuộc vào quyền truy cập và khả năng hỗ trợ API của trình duyệt.

---

## Preview

<p align="center">
  <img src="Screenshot%202026-11-10%2015.22.14.png" width="49%" alt="Photos screenshot 15.22.14">
  <img src="Screenshot%202026-11-10%2015.22.37.png" width="49%" alt="Photos screenshot 15.22.37">
</p>
<p align="center">
  <img src="Screenshot%202026-11-10%2015.22.43.png" width="49%" alt="Photos screenshot 15.22.43">
  <img src="Screenshot%202026-11-10%2015.22.47.png" width="49%" alt="Photos screenshot 15.22.47">
</p>

---

## 🌟 Tính năng nổi bật

### 🗂️ Thư viện ảnh (Gallery)

- **Hai chế độ duyệt:** Chuyển đổi giữa tab **All** và **Files**.
- **Sắp xếp theo thời gian:** Hiển thị ảnh theo các nhóm tháng/năm.
- **Tìm kiếm:** Tìm ảnh theo tên hoặc ngày.
- **Duyệt thư mục:** Xem nội dung thư mục, hiển thị tiêu đề thư mục và quay lại bằng nút Back.
- **Chọn nhiều ảnh:** Bật chế độ chọn để thao tác với nhiều mục.
- **Quản lý tệp:** Sao chép, cắt, dán và xóa ảnh.
- **Menu ngữ cảnh:** Nhấp chuột phải vào ảnh để mở các thao tác liên quan.
- **Thanh cuộn tùy chỉnh:** Giao diện cuộn riêng cho khu vực thư viện.

### 🖼️ Trình xem ảnh (Image Viewer)

- **Mở ảnh linh hoạt:** Chọn tệp, mở cả thư mục, kéo và thả hoặc dán ảnh từ clipboard.
- **Điều hướng ảnh:** Chuyển sang ảnh trước hoặc tiếp theo bằng nút điều khiển, phím mũi tên hoặc thao tác vuốt.
- **Thu phóng:** Phóng to, thu nhỏ và di chuyển ảnh trong khung xem.
- **Toàn màn hình:** Tập trung hiển thị ảnh trên nền đen; di chuyển chuột lên phía trên để hiện nút thoát.
- **Thông tin hình ảnh:** Hiển thị tên tệp, định dạng, dung lượng, ngày chỉnh sửa và kích thước ảnh.
- **EXIF Metadata:** Đọc thông tin máy ảnh và dữ liệu chụp ảnh khi tệp có chứa metadata tương ứng.
- **Hỗ trợ ảnh động:** Xem GIF, APNG và Animated WebP.

### ✏️ Trình chỉnh sửa ảnh (Image Editor)

- **Cắt ảnh (Crop):** Chọn vùng ảnh cần giữ lại.
- **Xoay và lật:** Xoay ảnh hoặc lật theo chiều ngang, chiều dọc.
- **Thay đổi kích thước:** Resize ảnh theo kích thước mong muốn.
- **Điều chỉnh hình ảnh:** Tùy chỉnh ánh sáng và màu sắc.
- **Chú thích (Annotation):** Vẽ bằng bút, đánh dấu bằng highlighter và xóa bằng eraser.
- **Chọn màu tùy chỉnh:** Sử dụng bộ chọn màu cho công cụ chú thích.
- **Undo / Redo:** Hoàn tác và làm lại các thao tác chỉnh sửa.

### 💾 Lưu và quản lý tệp

- **Save:** Lưu thay đổi vào tệp gốc khi có quyền ghi phù hợp.
- **Save As:** Xuất ảnh thành PNG, JPEG hoặc WebP.
- **Print:** In hình ảnh trực tiếp.
- **Share:** Chia sẻ ảnh thông qua các API được trình duyệt hỗ trợ.
- **Thao tác với tệp lỗi:** Ngay cả khi nội dung ảnh không thể đọc được, Photos vẫn có thể hiển thị thông tin và cung cấp các thao tác như sao chép, chia sẻ, đổi tên hoặc xóa khi được cấp quyền.
- **Quyền truy cập:** Các thao tác trên tệp phụ thuộc vào quyền mà trình duyệt cấp.

### ⚡ Hiệu năng

- **Lazy loading thumbnail:** Chỉ giải mã ảnh thu nhỏ khi cần hiển thị.
- **Hủy tác vụ không cần thiết:** Dừng xử lý thumbnail khi mục ảnh đã cuộn khỏi vùng cần hiển thị.
- **Tối ưu cho thiết bị cấu hình thấp:** Giảm số luồng xử lý ảnh thu nhỏ.
- **Placeholder:** Hiển thị biểu tượng thay thế trong khi thumbnail đang tải hoặc khi ảnh gặp lỗi.

### 🎨 Giao diện & Trải nghiệm

- **Material Design 3 Expressive:** Giao diện hiện đại, hiệu ứng Ripple và các thành phần Material Web Components.
- **Google Sans Flex:** Sử dụng kiểu chữ Google Sans Flex.
- **Giao diện tự động:** Tự động đồng bộ chế độ Sáng/Tối theo hệ thống.
- **PWA:** Có thể cài đặt Photos như một ứng dụng độc lập trên trình duyệt tương thích.
- **Tự động cập nhật:** Service Worker kiểm tra phiên bản mới và tự cập nhật ứng dụng khi có bản mới.

---

## ⌨️ Phím tắt điều khiển (Shortcuts)

| Phím tắt         | Thao tác                      |
| ---------------- | ----------------------------- |
| **`Ctrl` + `O`** | Mở hộp thoại chọn tệp         |
| **`←` / `→`**    | Chuyển ảnh trước / tiếp theo  |
| **`+` / `-`**    | Phóng to / Thu nhỏ            |
| **`Ctrl` + `S`** | Lưu dưới dạng                 |
| **`Ctrl` + `P`** | In ảnh                        |
| **`F2`**         | Đổi tên tệp (nếu được hỗ trợ) |

---

## 🚀 Cài đặt và chạy ứng dụng

### Cách 1: Cài đặt trực tiếp từ trình duyệt

1. Truy cập [Photos](https://tuanphong3108.github.io/photos/).
2. Tìm nút **Install** trên thanh địa chỉ trình duyệt.
3. Nhấn vào nút **Install**.
4. Xác nhận cài đặt trong hộp thoại của trình duyệt.

Sau khi cài đặt, Photos có thể được mở như một ứng dụng độc lập từ Launcher hoặc danh sách ứng dụng của hệ điều hành.

> Nếu không thấy nút Install, hãy kiểm tra menu trình duyệt để tìm tùy chọn cài đặt trang web dưới dạng ứng dụng. Khả năng cài đặt phụ thuộc vào trình duyệt và điều kiện hỗ trợ PWA.

### Cách 2: Chạy từ mã nguồn

Không cần Node.js hay build tool phức tạp.

1. Clone repository:
   ```bash
   git clone https://github.com/Tuanphong3108/photos.git
   ```
2. Truy cập thư mục dự án:
   ```bash
   cd photos
   ```
3. Khởi chạy máy chủ HTTP:
   ```bash
   python3 -m http.server
   ```
4. Mở trình duyệt và truy cập:
   ```text
   http://localhost:8000
   ```

> `vendor/mwc.js` là bản đóng gói sẵn của `@material/web`. Không cần cài đặt dependency hoặc chạy bước build.

---

## 🛠️ Công nghệ sử dụng

- **Core:** HTML5, CSS3, JavaScript.
- **Design System:** Material Web Components (`@material/web`).
- **Icons:** Material Symbols.
- **Typography:** Google Sans Flex.
- **Image Processing:** Canvas API và các API hình ảnh của trình duyệt.
- **File Handling:** File System Access API và các API tệp của trình duyệt.
- **Application:** Progressive Web App (PWA), Service Worker.

---

## 📝 Giấy phép (License)

Thông tin giấy phép được hiển thị trực tiếp trong hộp thoại **Giấy phép** của Photos.

- **Photos** — Giấy phép MIT © 2026 Phong VN
- **Material Web Components (@material/web)** — Giấy phép Apache 2.0
- **Material Symbols** — Giấy phép Apache 2.0
- **Google Sans Flex** — SIL Open Font License 1.1

---

## ❤️ Credits

Được xây dựng bởi **Phong VN**.

- [GitHub Repository](https://github.com/Tuanphong3108/photos)
- [Phong VN](https://tuanphong3108.github.io)

**Built with ❤️ by Phong VN.**
