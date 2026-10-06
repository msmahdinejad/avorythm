# Chrome Web Store — Vietnamese (vi)

## Tên

Avorythm — Lồng tiếng trực tiếp và phụ đề bằng AI

## Mô tả ngắn

Dịch bằng AI cho thẻ bạn chọn: lồng tiếng trực tiếp, phụ đề song ngữ và trình phát đồng bộ.

## Mô tả chi tiết

Xem khóa học, video và phim hoặc nghe podcast bằng ngôn ngữ của bạn. Avorythm dùng AI để dịch âm thanh từ thẻ trình duyệt mà bạn chủ động chọn. Nghe lời thoại được lồng tiếng trực tiếp, xem phụ đề gốc và phụ đề dịch, hoặc giữ âm thanh gốc và chỉ đọc bản dịch.

Chọn phát với độ trễ thấp ngay trên trang gốc hoặc dùng tính năng ghi và trình phát đồng bộ. Quá trình ghi đồng bộ chạy trước, còn trình phát độc lập cho phép tạm dừng, tua đến vị trí mong muốn và xem toàn màn hình. Bạn có thể kết thúc ghi theo cách thủ công.

Điều khiển độc lập bốn kênh: âm thanh gốc, âm thanh lồng tiếng, phụ đề gốc và phụ đề dịch. Điều chỉnh mức âm lượng của cả hai kênh, di chuyển và thay đổi kích thước lớp phủ phụ đề, rồi xuất video WebM theo thiết lập của bạn cùng các tệp phụ đề SRT riêng. Tùy chọn ghi thông thường cũng lưu cả hai bản âm thanh dưới dạng WAV và cả hai bản phụ đề dưới dạng SRT.

Tiện ích hoạt động độc lập, không cần ứng dụng máy tính, Python, FFmpeg, localhost hay thiết bị âm thanh ảo. Giao diện hiện hỗ trợ tiếng Anh, tiếng Ba Tư và tiếng Trung giản thể; ngôn ngữ đích để dịch được chọn riêng từ 79 mục ngôn ngữ.

Thiết lập: nhập khóa API Gemini của riêng bạn từ Google AI Studio trong phần Cài đặt, đồng ý rõ ràng với việc gửi âm thanh từ thẻ đã chọn đến Google Gemini, chọn ngôn ngữ rồi nhấn Bắt đầu. Chế độ chính xác tùy chọn dùng Groq Whisper để chuyển lời nói thành văn bản, Gemini để dịch văn bản và Gemini 3.1 Flash Live để tạo lời nói. Chế độ này cần khóa Groq, quyền truy cập trang web (quyền host) tùy chọn và sự đồng ý riêng cho việc gửi âm thanh.

Quyền riêng tư: việc thu âm chỉ bắt đầu sau khi bạn đồng ý và nhấn Bắt đầu. Âm thanh từ thẻ đã chọn và bản chép lời được gửi trực tiếp đến các nhà cung cấp AI cần thiết cho tác vụ bạn yêu cầu, không bao giờ gửi đến người duy trì Avorythm. Không có quảng cáo, công cụ phân tích hay máy chủ trung chuyển do nhà phát triển vận hành.

Theo mặc định, khóa API chỉ tồn tại trong phiên làm việc. Bạn có thể tùy chọn ghi nhớ khóa của từng nhà cung cấp trên thiết bị này; tùy chọn đó được tắt theo mặc định. Các bản sao được lưu không được đồng bộ hóa và không được tiện ích mã hóa. Tắt tính năng ghi nhớ sẽ xóa bản sao trên thiết bị; xóa một khóa sẽ xóa cả bản sao trên thiết bị lẫn bản sao trong phiên làm việc.

Chế độ ghi thông thường tạo bốn đầu ra được tắt theo mặc định. Chế độ đồng bộ ghi cục bộ để phát lại và xuất tệp, đồng thời chỉ giữ bản ghi mới nhất trong bộ nhớ riêng của Chrome. Các tệp tải xuống được lưu vào Downloads/Avorythm.

Avorythm miễn phí và có mã nguồn mở. Hạn mức miễn phí và khả năng cung cấp mô hình của các dịch vụ AI bên ngoài có thể thay đổi. Xử lý trực tiếp cần thời gian truyền qua mạng và không bảo đảm độ trễ bằng không hay bản dịch hoàn hảo; hãy kiểm tra những nội dung quan trọng. Nội dung được bảo vệ bằng DRM và các trang nội bộ của trình duyệt có thể ngăn việc thu âm.

Mã nguồn: https://github.com/msmahdinejad/avorythm

Hướng dẫn sử dụng (tiếng Anh): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Chính sách quyền riêng tư: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Có gì mới trong 1.1.16

- Chọn ngôn ngữ dễ hơn: các ngôn ngữ phổ biến được đưa lên đầu, với các biến thể tiếng Trung và tiếng Bồ Đào Nha được ghi rõ.
- Bổ sung tài liệu và tài nguyên dự án bằng tiếng Đức, tiếng Pháp, tiếng Ý, tiếng Nga và tiếng Ả Rập.
- Làm mới hình ảnh trên cửa hàng dựa trên giao diện thực tế của sản phẩm.
