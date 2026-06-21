// Shared shift color palette used across schedule, ShiftManagerModal and ShiftPickerModal
//
// Mỗi entry có 2 biến thể:
// - light: pastel nhạt, chữ đậm  (dùng khi giao diện sáng)
// - dark : nền đậm bão hoà vừa, chữ sáng (dùng khi giao diện tối)
//
// getShiftColor() tự chọn biến thể phù hợp dựa trên class "dark" trên <html>
// (được ThemeProvider toggle sẵn), nên không cần truyền thêm tham số ở chỗ gọi.

type ColorPair = { bg: string; fg: string };

const SHIFT_PALETTE: { light: ColorPair; dark: ColorPair }[] = [
  { light: { bg: "#fde68a", fg: "#78350f" }, dark: { bg: "#78350f", fg: "#fde68a" } }, // amber
  { light: { bg: "#bfdbfe", fg: "#1e3a8a" }, dark: { bg: "#1e3a8a", fg: "#bfdbfe" } }, // blue
  { light: { bg: "#bbf7d0", fg: "#14532d" }, dark: { bg: "#14532d", fg: "#bbf7d0" } }, // green
  { light: { bg: "#fecaca", fg: "#7f1d1d" }, dark: { bg: "#7f1d1d", fg: "#fecaca" } }, // red
  { light: { bg: "#ddd6fe", fg: "#4c1d95" }, dark: { bg: "#4c1d95", fg: "#ddd6fe" } }, // violet
  { light: { bg: "#fbcfe8", fg: "#831843" }, dark: { bg: "#831843", fg: "#fbcfe8" } }, // pink
  { light: { bg: "#a5f3fc", fg: "#155e75" }, dark: { bg: "#155e75", fg: "#a5f3fc" } }, // cyan
  { light: { bg: "#fed7aa", fg: "#7c2d12" }, dark: { bg: "#7c2d12", fg: "#fed7aa" } }, // orange
  { light: { bg: "#d9f99d", fg: "#365314" }, dark: { bg: "#365314", fg: "#d9f99d" } }, // lime
  { light: { bg: "#e9d5ff", fg: "#581c87" }, dark: { bg: "#581c87", fg: "#e9d5ff" } }, // purple
];

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Trả về cặp { bg, fg } theo index, tự động chọn biến thể light/dark
 * dựa trên theme hiện tại của app (class "dark" trên <html>).
 */
export function getShiftColor(index: number): ColorPair {
  const i = ((index % SHIFT_PALETTE.length) + SHIFT_PALETTE.length) % SHIFT_PALETTE.length;
  const pair = SHIFT_PALETTE[i];
  return isDarkMode() ? pair.dark : pair.light;
}

/**
 * Dùng khi cần cả 2 biến thể cùng lúc (ví dụ export ảnh/PDF luôn theo light
 * để in ấn nhất quán, không phụ thuộc theme đang xem trên màn hình).
 */
export function getShiftColorPair(index: number): { light: ColorPair; dark: ColorPair } {
  const i = ((index % SHIFT_PALETTE.length) + SHIFT_PALETTE.length) % SHIFT_PALETTE.length;
  return SHIFT_PALETTE[i];
}
