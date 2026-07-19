export const OPERATOR_COLORS = [
  "#111827",
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#e11d48",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#16a34a",
];

export function getOperatorColor(name: string, fallbackIndex = 0) {
  const hash = name
    .trim()
    .toLowerCase()
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return OPERATOR_COLORS[(hash + fallbackIndex) % OPERATOR_COLORS.length];
}
