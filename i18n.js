/* i18n.js: dịch giao diện Photos vi -> en lúc chạy (từ điển + quan sát DOM). Dùng chung cho index.html và getting_started.html.
   Ngôn ngữ: localStorage 'photos.lang' = 'vi' | 'en'; chưa chọn thì theo ngôn ngữ trình duyệt (vi -> tiếng Việt, còn lại -> English). */
(function () {
  var KEY = 'photos.lang', stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* bỏ qua */ }
  var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'vi';
  var lang = stored === 'vi' || stored === 'en' ? stored : (/^vi/i.test(nav) ? 'vi' : 'en');
  var I = window.I18N = {
    lang: lang, locale: lang === 'en' ? 'en-US' : 'vi-VN',
    set: function (l) { try { localStorage.setItem(KEY, l); } catch (e) { /* bỏ qua */ } },
    tr: function (s) { return s; }, apply: function () {}
  };
  document.documentElement.lang = lang;
  if (lang === 'vi') return;

  var D = {
"Sắp xếp": "Sort",
"Theo ngày tạo": "By date created",
"Theo ngày sửa": "By date modified",
"Từ A - Z": "From A to Z",
"Từ Z - A": "From Z to A",
"Từ gần đây nhất": "Newest first",
"Từ lâu nhất": "Oldest first",
"Đang đọc ngày tạo của ảnh...": "Reading photo creation dates...",
"Ngôn ngữ": "Language",

"Thư viện ảnh - Photos": "Gallery - Photos",
"Ảnh động chỉ có thể xem, chưa chỉnh sửa được": "Animated images can only be viewed, not edited yet",
"Kích thước quá lớn": "Size is too large",
"Tự do": "Free",
"Gốc": "Original",
"Chưa chọn vùng cần cắt": "No crop area selected",
"Định dạng không được hỗ trợ": "Unsupported format",
"Photos chưa mở được loại tệp này. Hãy thử ảnh PNG, JPEG, WebP, GIF, BMP hoặc AVIF.": "Photos can't open this type of file yet. Try a PNG, JPEG, WebP, GIF, BMP or AVIF image.",
"Không thể mở ảnh này": "Can't open this image",
"Tệp có thể bị hỏng hoặc trình duyệt không giải mã được định dạng này.": "The file may be corrupted or the browser can't decode this format.",
"Không thể đọc tệp": "Can't read the file",
"Tệp đã bị di chuyển, xóa hoặc bạn không còn quyền truy cập.": "The file was moved or deleted, or you no longer have access.",
"Photos không phát video": "Photos doesn't play videos",
"Đây là tệp video. Photos chỉ dành cho ảnh, hãy mở tệp bằng Media Player để phát hoặc thêm vào danh sách phát.": "This is a video file. Photos is for images only. Open it in Media Player to play it or add it to the queue.",
"Ảnh quá lớn": "Image is too large",
"Kích thước ảnh vượt quá giới hạn mà trình duyệt có thể xử lý (16384 px mỗi cạnh).": "The image exceeds what the browser can handle (16384 px per side).",
"Bỏ các thay đổi chưa lưu?": "Discard unsaved changes?",
"Ảnh này có chỉnh sửa chưa được lưu. Nếu tiếp tục, các thay đổi sẽ bị mất.": "This image has unsaved edits. If you continue, the changes will be lost.",
"Ở lại": "Stay",
"Bỏ thay đổi": "Discard",
"Cấp quyền thư mục": "Folder permission",
"Hủy": "Cancel",
"Chọn thư mục": "Choose folder",
"Thư mục đã chọn không chứa ảnh này": "The selected folder doesn't contain this image",
"Tên tệp không hợp lệ": "Invalid file name",
"Đã có tệp trùng tên": "A file with this name already exists",
"Không thể đổi tên tệp này": "Can't rename this file",
"Đã đổi tên": "Renamed",
"Không thể xóa ảnh này vì Photos không có quyền truy cập tệp": "Can't delete this image because Photos has no access to the file",
"Xóa ảnh này?": "Delete this image?",
"Xóa": "Delete",
"Không thể xóa tệp": "Can't delete the file",
"Đã xóa ảnh": "Image deleted",
"Ảnh": "Image",
"Không thể mở hộp thoại chọn tệp": "Can't open the file picker",
"Chọn ảnh": "Choose images",
"Thư viện ảnh": "Gallery",
"Chưa có ảnh nào": "No photos yet",
"Thêm thư mục ảnh để xem tất cả ảnh của bạn tại đây, kể cả trong thư mục con. Photos sẽ ghi nhớ các thư mục này cho những lần mở sau.": "Add a photo folder to see all your photos here, including subfolders. Photos remembers these folders for next time.",
"Photos không tìm thấy ảnh nào trong các thư mục đã thêm.": "Photos didn't find any photos in the folders you added.",
"Thư mục theo dõi": "Watched folders",
"Thư mục": "Folder",
"Thư mục này không có ảnh.": "This folder has no photos.",
"Không rõ ngày": "Unknown date",
"Không thể dán vào thư mục này": "Can't paste into this folder",
"Đổi tên": "Rename",
"Tên": "Name",
"Loại": "Type",
"Dung lượng": "Size",
"Ngày sửa đổi": "Date modified",
"Kích thước": "Dimensions",
"Thông tin ảnh": "Photo info",
"Đóng": "Close",
"Tháng ... năm ...": "Month ... year ...",
"Không thể mở thư mục": "Can't open the folder",
"Thư mục này đã được theo dõi": "This folder is already watched",
"Thư mục không có ảnh": "The folder has no photos",
"Cần cấp lại quyền truy cập": "Access needs to be granted again",
"Đang theo dõi, gồm cả thư mục con": "Watching, including subfolders",
"Chưa có thư mục nào được theo dõi. Thêm thư mục để xem ảnh trong Thư viện ảnh.": "No folders are being watched yet. Add a folder to see its photos in the Gallery.",
"Hủy theo dõi": "Stop watching",
"Cài Photos như một ứng dụng để mở ảnh trực tiếp bằng \"Mở bằng Photos\" trong trình quản lý tệp và dùng offline.": "Install Photos as an app to open images directly with \"Open with Photos\" from your file manager and use it offline.",
"Quản lý thư mục ảnh": "Manage photo folders",
"Thêm thư mục ảnh": "Add photo folder",
"Không có tệp để mở": "No file to open",
"Đã thêm vào danh sách phát của Media Player": "Added to the Media Player queue",
"Không thể gửi tệp sang Media Player": "Can't send the file to Media Player",
"Ảnh đã dán.png": "Pasted image.png",
"Mở bằng Photos": "Open with Photos",
"Tệp": "File",
"Tình trạng": "Status",
"Không thể đọc nội dung ảnh": "Can't read the image data",
"Máy ảnh": "Camera",
"Hãng": "Make",
"Kiểu máy": "Model",
"Ống kính": "Lens",
"Khẩu độ": "Aperture",
"Tốc độ màn trập": "Shutter speed",
"Tiêu cự": "Focal length",
"Ngày chụp": "Date taken",
"Đã lưu": "Saved",
"Chưa có thay đổi nào": "No changes yet",
"Không thể lưu vào tệp gốc, hãy thử \"Lưu dưới dạng\"": "Can't save to the original file. Try \"Save as\"",
"Ảnh động chỉ có thể xem": "Animated images can only be viewed",
"Không thể lưu ảnh": "Can't save the image",
"Trình duyệt không hỗ trợ chia sẻ tệp này": "Your browser doesn't support sharing this file",
"Đã sao chép ảnh vào bộ nhớ tạm": "Image copied to the clipboard",
"Không thể chia sẻ ảnh này": "Can't share this image",
"Mở và chỉnh sửa ảnh": "Open and edit photos",
"Xem bài gốc của Google": "View Google's original article",
"Giấy phép": "License",
"Không thể bật toàn màn hình": "Can't enter full screen",
"Thoát toàn màn hình": "Exit full screen",
"Toàn màn hình": "Full screen",
"Đã sao chép tệp. Mở thư mục đích trong Files UI rồi bấm Dán": "File copied. Open the destination folder in Files UI and press Paste",
"Đã sao chép tệp vào bộ nhớ tạm": "File copied to the clipboard",
"Không thể sao chép tệp lỗi này": "Can't copy this broken file",
"Không thể sao chép ảnh này": "Can't copy this image",
"Không thể dán từ bộ nhớ tạm": "Can't paste from the clipboard",
"Bỏ chọn": "Deselect",
"Chọn": "Select",
"Mở": "Open",
"Mở bằng Media Player": "Open with Media Player",
"Sao chép": "Copy",
"Cắt": "Cut",
"Dán": "Paste",
"Chọn tất cả": "Select all",
"Làm mới": "Refresh",
"Thêm thư mục ảnh...": "Add photo folder...",
"Mở ảnh...": "Open image...",
"Mở thư mục...": "Open folder...",
"Thông tin": "Info",
"Sao chép tệp": "Copy file",
"Chia sẻ": "Share",
"Quay lại thư viện": "Back to Gallery",
"Sao chép ảnh": "Copy image",
"Phóng to": "Zoom in",
"Thu nhỏ": "Zoom out",
"Vừa khung": "Fit to window",
"Đổi tên tệp": "Rename file",
"Tên tệp (không gồm phần đuôi)": "File name (without extension)",
"Tên tệp": "File name",
"Cắt và xoay": "Crop & rotate",
"Đổi kích thước": "Resize",
"Ánh sáng và màu sắc": "Light & color",
"Chú thích": "Markup",
"Hoàn tác": "Undo",
"Làm lại": "Redo",
"Thoát chế độ chọn": "Exit selection mode",
"0 ảnh đã chọn": "0 selected",
"Hủy chỉnh sửa": "Discard edits",
"Lưu": "Save",
"Tùy chọn lưu": "Save options",
"Lưu dưới dạng": "Save as",
"Thêm": "More",
"Mở...": "Open...",
"Hướng dẫn bắt đầu": "Getting started",
"Trợ giúp": "Help",
"Chế độ xem": "View",
"Tất cả ảnh": "All photos",
"Tìm theo tên hoặc ngày (vd: 4/2026)": "Search by name or date (e.g. 4/2026)",
"Tìm ảnh theo tên hoặc ngày": "Search photos by name or date",
"Xóa tìm kiếm": "Clear search",
"Cấp quyền": "Grant access",
"Mở ảnh": "Open image",
"Đang quét thư mục": "Scanning folders",
"Ảnh trước": "Previous photo",
"Ảnh sau": "Next photo",
"Kéo thả ảnh hoặc thư mục vào đây, hoặc dán ảnh từ bộ nhớ tạm.": "Drag and drop photos or folders here, or paste an image from the clipboard.",
"Mở thư mục": "Open folder",
"Đang tải": "Loading",
"Mở ảnh khác": "Open another image",
"Xoay và lật": "Rotate & flip",
"Xoay trái 90°": "Rotate left 90°",
"Xoay phải 90°": "Rotate right 90°",
"Lật ngang": "Flip horizontal",
"Lật dọc": "Flip vertical",
"Tỷ lệ khung hình": "Aspect ratio",
"Áp dụng": "Apply",
"Chiều rộng": "Width",
"Chiều cao": "Height",
"Bật/tắt khóa tỷ lệ khung hình": "Lock/unlock aspect ratio",
"Độ phơi sáng": "Exposure",
"Độ tương phản": "Contrast",
"Độ bão hòa": "Saturation",
"Đặt lại": "Reset",
"Bút": "Pen",
"Bút đánh dấu": "Highlighter",
"Tẩy": "Eraser",
"Đánh chữ": "Text",
"Phông chữ": "Font",
"In đậm": "Bold",
"In nghiêng": "Italic",
"Cỡ chữ": "Font size",
"Độ đậm": "Weight",
"Độ bo tròn": "Roundness",
"Nhấn vào ảnh để gõ chữ. Enter để xong, Shift+Enter để xuống dòng, Esc để huỷ.": "Click the image to type. Enter to finish, Shift+Enter for a new line, Esc to cancel.",
"Kiểu chọn màu": "Color picker mode",
"Bảng màu": "Palette",
"Tuỳ chỉnh": "Custom",
"Hệ lục phân": "Hex",
"Color Picker: lấy màu từ bất kỳ đâu trên màn hình": "Color Picker: pick a color from anywhere on the screen",
"Bắt đầu - Photos": "Getting started - Photos",
"Bỏ qua": "Skip",
"Chào mừng": "Welcome",
"Thêm ảnh": "Add photos",
"Tính năng": "Features",
"Phím tắt": "Shortcuts",
"Bắt đầu": "Start",
"Chào mừng đến với Photos": "Welcome to Photos",
"Trình xem và chỉnh sửa ảnh kiểu ChromeOS Gallery: duyệt ảnh theo thời gian hoặc theo thư mục, chỉnh sửa nhanh, và dùng được cả khi không có mạng. Ảnh luôn ở trên máy bạn, không tải lên đâu cả.": "A ChromeOS Gallery-style photo viewer and editor: browse by date or by folder, edit quickly, and use it even without a connection. Your photos stay on your device and are never uploaded.",
"Mọi thao tác diễn ra ngay trong trình duyệt. Photos chỉ đọc những thư mục mà bạn cho phép.": "Everything happens right in your browser. Photos only reads the folders you allow.",
"Thư viện": "Gallery",
"Thêm ảnh vào Photos": "Add photos to Photos",
"Chọn thư mục chứa ảnh một lần, Photos sẽ nhớ và hiển thị toàn bộ ảnh trong đó, kể cả thư mục con.": "Choose a photo folder once and Photos will remember it and show every photo inside, including subfolders.",
"Thêm một hoặc nhiều thư mục. Quản lý chúng bất cứ lúc nào ở menu 3 chấm > Quản lý thư mục ảnh.": "Add one or more folders. Manage them any time from the three-dot menu > Manage photo folders.",
"Thư viện ảnh & Files UI": "Gallery & Files UI",
"Xem tất cả ảnh sắp theo ngày, hoặc chuyển sang tab Files UI để duyệt theo cây thư mục.": "See all photos sorted by date, or switch to the Files UI tab to browse by folder tree.",
"Kéo & thả": "Drag & drop",
"Mọi thứ": "Everything",
"Xem, tìm và chỉnh sửa": "View, search and edit",
"Tìm kiếm thông minh": "Smart search",
"Chọn nhiều ảnh": "Select multiple photos",
"Bấm \"Chọn\" để xóa hàng loạt; trong Files UI còn có thể sao chép, cắt và dán giữa các thư mục.": "Press \"Select\" to delete in bulk; in Files UI you can also copy, cut and paste between folders.",
"Xem toàn màn hình": "Full-screen view",
"Cắt & xoay": "Crop & rotate",
"Cắt theo tỉ lệ, xoay, lật và đổi kích thước ảnh.": "Crop to a ratio, rotate, flip and resize photos.",
"Điều chỉnh": "Adjust",
"Chỉnh độ sáng, tương phản, màu sắc, hoặc vẽ và tô sáng trực tiếp lên ảnh.": "Adjust brightness, contrast and color, or draw and highlight right on the photo.",
"Chèn chữ": "Add text",
"Thêm văn bản với nhiều phông chữ, đậm, nghiêng và màu tùy chọn.": "Add text with many fonts, bold, italic and any color.",
"Điều khiển không cần chuột": "Control without a mouse",
"In": "Print",
"Ảnh trước / sau": "Previous / next photo",
"Phóng to / thu nhỏ": "Zoom in / out",
"Vừa khung hình": "Fit to window",
"Tìm kiếm": "Search",
"Sẵn sàng rồi!": "You're all set!",
"Chọn thư mục ảnh ngay bây giờ để bắt đầu, hoặc để sau cũng được, bạn luôn thêm được trong Thư viện ảnh. Có thể xem lại hướng dẫn này ở menu 3 chấm > Hướng dẫn bắt đầu.": "Choose a photo folder now to get going, or do it later, you can always add one in the Gallery. You can reopen this guide from the three-dot menu > Getting started.",
"Chọn thư mục ảnh": "Choose photo folder",
"Thêm thư mục khác": "Add another folder",
"Trình duyệt không hỗ trợ chọn thư mục": "Your browser doesn't support choosing folders",
"Quay lại": "Back",
"Tiếp theo": "Next",
"Bắt đầu xem ảnh": "Start viewing photos",
"Ngôn ngữ": "Language"
};
  var DH = {
"Kéo ảnh hoặc cả thư mục vào cửa sổ, hoặc dán ảnh từ clipboard bằng <kbd>Ctrl</kbd> + <kbd>V</kbd>.": "Drag photos or whole folders into the window, or paste an image from the clipboard with <kbd>Ctrl</kbd> + <kbd>V</kbd>.",
"<b>Photos không phát video.</b> Video (mp4, webm, mkv, mov...) vẫn hiện trong thư viện với biểu tượng Media Player; bấm vào để mở bằng <a href=\"https://tuanphong3108.github.io/music-player/\" target=\"_blank\" rel=\"noopener noreferrer\">Media Player</a> và thêm vào danh sách phát của nó.": "<b>Photos doesn't play videos.</b> Videos (mp4, webm, mkv, mov...) still appear in the gallery with a Media Player icon; click one to open it in <a href=\"https://tuanphong3108.github.io/music-player/\" target=\"_blank\" rel=\"noopener noreferrer\">Media Player</a> and add it to its queue.",
"Cài Photos như một ứng dụng để mở ảnh trực tiếp bằng \"Mở bằng Photos\" trong trình quản lý tệp và dùng offline.": "Install Photos as an app to open images directly with \"Open with Photos\" from your file manager and use it offline.",
"Tìm theo tên hoặc ngày tháng: <kbd>2026</kbd>, <kbd>4/2026</kbd>, <kbd>31 8 2025</kbd>. Kéo thanh cuộn sẽ hiện tháng và năm.": "Search by name or date: <kbd>2026</kbd>, <kbd>4/2026</kbd>, <kbd>31 8 2025</kbd>. Drag the scrollbar to see the month and year.",
"Cuộn chuột để phóng to, nhấn <kbd>F</kbd> để vào chế độ toàn màn hình toàn đen.": "Scroll the wheel to zoom, press <kbd>F</kbd> for a distraction-free black full-screen mode."
};
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var P = [
    [/^Kích thước (\d+)$/, 'Size $1'],
    [/^(\d+) ảnh đã chọn$/, '$1 selected'],
    [/^Kết quả trong “(.*)” \((\d+)\)$/, 'Results in “$1” ($2)'],
    [/^Không tìm thấy ảnh nào khớp “(.*)”\.$/, 'No photos match “$1”.'],
    [/^(\d+) ảnh$/, function (m) { return m[1] + (m[1] === '1' ? ' photo' : ' photos'); }],
    [/^Kết quả \((\d+)\)$/, 'Results ($1)'],
    [/^Đã (cắt|sao chép) (\d+) ảnh\. Mở thư mục đích rồi bấm Dán$/, function (m) { return (m[1] === 'cắt' ? 'Cut ' : 'Copied ') + m[2] + (m[2] === '1' ? ' photo' : ' photos') + '. Open the destination folder and press Paste'; }],
    [/^Đã dán (\d+) ảnh, (\d+) ảnh lỗi$/, 'Pasted $1 photo(s), $2 failed'],
    [/^Đã dán (\d+) ảnh$/, 'Pasted $1 photo(s)'],
    [/^Xóa (\d+) ảnh\?$/, 'Delete $1 photos?'],
    [/^Đã xóa (\d+) ảnh$/, 'Deleted $1 photo(s)'],
    [/^Đã xóa (\d+)\/(\d+) ảnh$/, 'Deleted $1 of $2 photos'],
    [/^Tháng (\d+) năm (\d+)$/, function (m) { return MONTHS[(+m[1] - 1) % 12] + ' ' + m[2]; }],
    [/^Đã thêm thư mục “(.*)”$/, 'Added folder “$1”'],
    [/^Photos cần bạn cấp lại quyền truy cập thư mục: (.*)$/, 'Photos needs access to these folders again: $1'],
    [/^1\/(\d+) giây$/, '1/$1 s'],
    [/^([\d.,]+) giây$/, '$1 s'],
    [/^Đã gửi (\d+) tệp sang Media Player$/, 'Sent $1 files to Media Player'],
    [/^Sao chép \((\d+)\)$/, 'Copy ($1)'],
    [/^Cắt \((\d+)\)$/, 'Cut ($1)'],
    [/^Xóa \((\d+)\)$/, 'Delete ($1)'],
    [/^Thêm vào Media Player( \(\d+\))?$/, function (m) { return 'Add to Media Player' + (m[1] || ''); }],
    [/^(\d+) ảnh đã chọn sẽ bị xóa khỏi thiết bị\. Bạn không thể hoàn tác thao tác này\.$/, '$1 selected photos will be deleted from your device. This can\'t be undone.'],
    [/^Bước (\d+) \/ (\d+)$/, 'Step $1 / $2'],
    [/^Đã chọn: (.*)$/, 'Selected: $1']
  ];
  var PH = [
    [/^Tệp <b>(.*)<\/b> sẽ bị xóa khỏi thiết bị\. Bạn không thể hoàn tác thao tác này\.$/, 'The file <b>$1</b> will be deleted from your device. This can\'t be undone.'],
    [/^Để đổi tên ảnh này, Photos cần quyền truy cập thư mục chứa nó\. Hãy chọn thư mục chứa <b>(.*)<\/b>\.$/, 'To rename this image, Photos needs access to the folder that contains it. Choose the folder containing <b>$1</b>.']
  ];
  var NONASCII = /[^\x00-\x7f]/;
  function run(list, t) {
    for (var i = 0; i < list.length; i++) { var m = list[i][0].exec(t); if (m) return typeof list[i][1] === 'function' ? list[i][1](m) : t.replace(list[i][0], list[i][1]); }
    return null;
  }
  function lookup(t) {
    if (Object.prototype.hasOwnProperty.call(D, t)) return D[t];
    return NONASCII.test(t) ? run(P, t) : null;
  }
  function tr(s) {
    if (typeof s !== 'string') return s;
    var t = s.trim(); if (!t) return s;
    var r = lookup(t); if (r === null) return s;
    var i = s.indexOf(t); return s.slice(0, i) + r + s.slice(i + t.length);
  }
  function trHtml(h) {
    var t = h.trim();
    if (Object.prototype.hasOwnProperty.call(DH, t)) return DH[t];
    if (Object.prototype.hasOwnProperty.call(D, t)) return D[t];
    return NONASCII.test(t) ? run(PH, t) : null;
  }
  var ATTRS = ['aria-label', 'title', 'placeholder', 'label', 'data-tip', 'supporting-text', 'suffix-text', 'alt'];
  function mixed(e) {
    if (!e.firstElementChild) return false;
    for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && NONASCII.test(n.nodeValue)) return true;
    return false;
  }
  function node(n) {
    if (n.nodeType === 3) {
      var p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return;
      var v = n.nodeValue, r = tr(v); if (r !== v) n.nodeValue = r; return;
    }
    if (n.nodeType !== 1 || n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') return;
    for (var i = 0; i < ATTRS.length; i++) { var a = n.getAttribute(ATTRS[i]); if (a) { var ra = tr(a); if (ra !== a) n.setAttribute(ATTRS[i], ra); } }
    if (mixed(n)) { var h = trHtml(n.innerHTML); if (h !== null) { n.innerHTML = h; return; } }
    for (var c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function apply(root) { node(root || document.documentElement); }
  I.tr = tr; I.apply = apply;
  var obs = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'characterData') node(m.target);
      else if (m.type === 'attributes') { var v = m.target.getAttribute(m.attributeName); if (v) { var r = tr(v); if (r !== v) m.target.setAttribute(m.attributeName, r); } }
      else for (var j = 0; j < m.addedNodes.length; j++) node(m.addedNodes[j]);
      if (m.type === 'childList' && m.target.nodeType === 1 && m.addedNodes.length) { var t = m.target; if (mixed(t)) { var h = trHtml(t.innerHTML); if (h !== null) t.innerHTML = h; } }
    }
  });
  function start() {
    apply(document.documentElement);
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  I.HELP_EN = "<p>Photos helps you manage the photo library on your device, view photos and make basic edits. You can browse photos by date, open folders, select several photos to manage them, or open a single photo to view and edit it.</p>\n\n<h3>Gallery</h3>\n<ul>\n  <li><b>All:</b> shows the photos in your library, sorted and grouped by month and year so they are easy to find.</li>\n  <li><b>Files:</b> browse photos by folder on your device. Select a folder to see what's inside; use the <b>Back</b> button to return to the previous folder.</li>\n  <li><b>Search:</b> use the search box to find photos by name or date.</li>\n  <li><b>Select photos:</b> turn on <b>Select</b> mode and click the photos you want to act on. You can select several photos at once.</li>\n  <li><b>Copy and move:</b> use <b>Copy</b> or <b>Cut</b>, then open the destination folder and choose <b>Paste</b>.</li>\n  <li><b>Delete:</b> select one or more photos, use Delete and confirm.</li>\n  <li><b>Context menu:</b> right-click a photo to see the actions that fit that file.</li>\n  <li><b>Scrollbar:</b> use the custom scrollbar to move quickly through your gallery.</li>\n</ul>\n\n<h3>Opening photos</h3>\n<ul>\n  <li>Choose the <b>More</b> icon (⋮) and then <b>Open...</b> (<kbd>Ctrl + O</kbd>) to pick one or more photos, or <b>Open folder...</b> to add a photo folder. Photos remembers the folder and shows all its photos (including subfolders) in the <b>Gallery</b> every time you open the app.</li>\n  <li>Select a photo in the Gallery to view and edit it; choose the <b>Back</b> arrow (or press <kbd>Esc</kbd>) to return to the gallery. Use <b>Manage photo folders</b> in the <b>More</b> menu to add or stop watching folders.</li>\n  <li>Drag and drop photos or folders into the window, or paste an image from the clipboard (<kbd>Ctrl + V</kbd>).</li>\n  <li>After you install Photos as an app, you can right-click a photo in the Files app and choose <b>Open with Photos</b>.</li>\n  <li>To move between photos, use the arrow buttons on either side, the <kbd>←</kbd> / <kbd>→</kbd> keys, or swipe sideways.</li>\n</ul>\n\n<h3>Viewing photos</h3>\n<ul>\n  <li><b>Zoom:</b> use the Zoom in / Zoom out icons, the <kbd>+</kbd> / <kbd>−</kbd> keys, <kbd>Ctrl</kbd> + mouse wheel, or pinch with two fingers. Double-click to zoom in or return to fit (<kbd>0</kbd>). When zoomed in, drag the photo to pan.</li>\n  <li><b>Full screen:</b> choose the Full screen icon or press <kbd>F</kbd> to focus on the photo. Move the mouse to the top to show the exit full screen control.</li>\n  <li><b>Info:</b> choose the Info icon (<kbd>I</kbd>) to see the name, type, size, date modified, dimensions and EXIF data of the photo (if available).</li>\n</ul>\n\n<h3>Editing photos</h3>\n<p>Select a photo and use the icons on the toolbar:</p>\n<ul>\n  <li><b>Rename:</b> choose the file name at the top left (or press <kbd>F2</kbd>), type a new name and press <kbd>Enter</kbd>. The file extension is kept.</li>\n  <li><b>Crop &amp; rotate:</b> drag the frame to crop, choose an aspect ratio, rotate by 90° or flip horizontally / vertically, then choose <b>Apply</b>.</li>\n  <li><b>Resize:</b> enter a width and height. Turn the aspect ratio lock on or off to keep or change the proportions.</li>\n  <li><b>Light &amp; color:</b> drag the sliders to adjust exposure, contrast and saturation.</li>\n  <li><b>Markup:</b> draw with the pen or highlighter, or use the eraser to remove strokes you drew. Choose the stroke size and a color from the palette, or choose <b>Custom</b> to enter a color code or use the <b>Color Picker</b> to pick a color from anywhere on the screen. Choose <b>Close</b> when you're done drawing.</li>\n  <li><b>Text:</b> in <b>Markup</b>, choose the text tool, click the photo and type. Choose a font, size and weight; with Google Sans Flex you can also adjust the roundness. Press Enter to finish, Shift+Enter for a new line, Esc to cancel.</li>\n  <li><b>Undo and redo:</b> use the Undo / Redo icons (<kbd>Ctrl + Z</kbd> / <kbd>Ctrl + Shift + Z</kbd>).</li>\n</ul>\n\n<h3>Saving, printing and sharing</h3>\n<ul>\n  <li>After editing, choose <b>Save</b> to write to the original file, or <b>Discard edits</b> to drop all changes.</li>\n  <li><b>Save as</b> (<kbd>Ctrl + S</kbd>) lets you set a new name and choose PNG, JPEG or WebP.</li>\n  <li><b>Print:</b> choose the More icon (⋮) and then <b>Print</b> (<kbd>Ctrl + P</kbd>).</li>\n  <li><b>Delete:</b> choose the Delete icon (or the <kbd>Delete</kbd> key) and confirm to remove the file from your device. Only photos opened with <b>Open...</b>, <b>Open folder...</b> or <b>Open with Photos</b> can be deleted.</li>\n  <li><b>Share:</b> choose the Share icon to send the photo to other apps, or copy the photo to the clipboard if your device doesn't support sharing.</li>\n</ul>\n\n<h3>Related apps</h3>\n<ul>\n  <li><b>Media Player:</b> use it to play music and videos. Photos focuses on managing, viewing and editing images. Videos still appear in the gallery: click a video file and choose <b>Open with Media Player</b> to add it to the queue (right-click has this option too). <a href=\"https://tuanphong3108.github.io/music-player/\" target=\"_blank\" rel=\"noopener noreferrer\">Open Media Player</a>.</li>\n</ul>\n\n<h3>Notes</h3>\n<ul>\n  <li>Animated images (GIF, APNG, animated WebP) can only be viewed; the editing tools are grayed out.</li>\n  <li>Some formats such as HEIC can't be opened yet.</li>\n  <li>Thumbnails are loaded on demand to reduce resource usage on your device.</li>\n  <li>If a photo file can't be read, Photos shows an error icon instead of the thumbnail.</li>\n</ul>\n";
  I.LICENSE_EN = '<pre>Photos — MIT License\n© 2026 Phong VN\n\nThird-party components:\n• Material Web Components (@material/web) — Apache License 2.0\n• Material Symbols — Apache License 2.0\n• Google Sans Flex, Roboto, Open Sans, Montserrat, Lora, Playfair Display, Roboto Mono, Dancing Script — SIL Open Font License 1.1</pre>';
})();
