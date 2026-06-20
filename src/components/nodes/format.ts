/** Compact value for the live readout on a node (7039.99 → "7040", 0.42 → "0.42"). */
export function formatValue(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}
