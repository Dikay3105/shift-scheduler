
# Lịch Làm Việc — Phiên bản TypeScript/React

Dựng lại giao diện từ file HTML đã upload, chuyển sang React + TypeScript, thêm CRUD đầy đủ và hiển thị tuần theo thời gian thực.

## Tính năng

1. **Bảng lịch tuần**
   - Cột: Nhân viên · Thứ 2 → Chủ Nhật (T7/CN highlight cuối tuần)
   - Header tuần tự động tính theo ngày hiện tại (real-time): "Tuần XX · YYYY", subtitle "Tuần từ DD – DD"
   - Nút ◀ / ▶ để chuyển tuần trước / sau, nút "Hôm nay" để về tuần hiện tại

2. **CRUD Nhân viên**
   - Panel/modal "Quản lý nhân viên": thêm, sửa tên, đổi màu nhãn (chấm tròn + pill), xóa
   - Mỗi nhân viên là 1 hàng trong bảng

3. **CRUD Ca làm (định nghĩa ca)**
   - Modal "Quản lý ca": list ca hiện có (mã ca, tên, giờ bắt đầu/kết thúc, màu nền/chữ, nhóm Sáng/Chiều/Tối)
   - Thêm ca mới, sửa giờ + màu, xóa ca
   - Khi sửa giờ → tất cả chip đang dùng ca đó cập nhật theo

4. **Gán ca cho nhân viên theo ngày**
   - Click ô trống (＋) → mở picker chọn ca (grid Sáng/Chiều/Tối như bản gốc)
   - Click chip ca đã có → đổi ca khác hoặc xóa
   - Nút "Xóa tất cả ca" trong tuần (có confirm)

5. **Lưu trữ**
   - localStorage (nhân viên, ca, phân ca theo tuần) — bền vững giữa các lần load
   - Không cần backend

## Kỹ thuật

- Route mới: `src/routes/index.tsx` (thay placeholder) — trang chính là lịch
- Components:
  - `ScheduleTable.tsx` — bảng chính
  - `EmployeeManagerModal.tsx`, `ShiftManagerModal.tsx`, `ShiftPickerModal.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`
- Hooks: `useSchedule.ts` (state + localStorage), `useCurrentWeek.ts` (tính tuần ISO real-time)
- Types: `Employee`, `Shift`, `Assignment` (key: `${employeeId}-${isoDate}` → shiftId)
- Tailwind + design tokens trong `src/styles.css` (port palette --c1..--c7 + header-bg sang oklch tokens)
- Date helpers: viết tay (start of ISO week, format DD/MM, week number) — không cần thêm dependency

## Ngoài phạm vi (giữ đơn giản)

- Bỏ Xuất PDF / Xuất Word (có thể thêm sau nếu cần)
- Không tích hợp backend / Lovable Cloud (dùng localStorage)

Sau khi bạn duyệt, mình sẽ build trực tiếp.
