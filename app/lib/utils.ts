export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '₪0.00';
  const rounded = Math.round(num);
  return `₪${rounded.toLocaleString('he-IL')}.00`;
}
