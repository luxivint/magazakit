export function formatMoney(value: number, fractionDigits = 2): string {
  return `₺${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}
