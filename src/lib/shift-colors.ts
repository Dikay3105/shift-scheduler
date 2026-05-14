// Shared shift color palette used across schedule, ShiftManagerModal and ShiftPickerModal
export const SHIFT_PALETTE = [
  { bg: "#fde68a", fg: "#78350f" }, // amber
  { bg: "#bfdbfe", fg: "#1e3a8a" }, // blue
  { bg: "#bbf7d0", fg: "#14532d" }, // green
  { bg: "#fecaca", fg: "#7f1d1d" }, // red
  { bg: "#ddd6fe", fg: "#4c1d95" }, // violet
  { bg: "#fbcfe8", fg: "#831843" }, // pink
  { bg: "#a5f3fc", fg: "#155e75" }, // cyan
  { bg: "#fed7aa", fg: "#7c2d12" }, // orange
  { bg: "#d9f99d", fg: "#365314" }, // lime
  { bg: "#e9d5ff", fg: "#581c87" }, // purple
];

export function getShiftColor(index: number) {
  return SHIFT_PALETTE[((index % SHIFT_PALETTE.length) + SHIFT_PALETTE.length) % SHIFT_PALETTE.length];
}
