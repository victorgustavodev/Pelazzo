export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  );
export function parseMoney(input: string, optional = false): number | null {
  const value = input.trim();
  if (!value && optional) return null;
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(value))
    throw new Error('Informe um valor como 27,50, sem separador de milhar.');
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents < 1n || cents > 2147483647n)
    throw new Error('O valor deve ser positivo e até R$ 21.474.836,47.');
  return Number(cents);
}
export const moneyInput = (value: number | null | undefined) =>
  value == null
    ? ''
    : `${Math.floor(value / 100)},${String(value % 100).padStart(2, '0')}`;
export const date = (value: string, timezone = 'America/Sao_Paulo') =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));
export function localDateTime(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function themeText(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? '#000000'
    : '#ffffff';
}
export const modality = (value: string) =>
  value === 'MONTHLY' ? 'Mensalista' : 'Diarista';
export const matchStatus = (value: string) =>
  ({ SCHEDULED: 'Agendada', FINISHED: 'Finalizada', CANCELED: 'Cancelada' })[
    value
  ] ?? value;
export const formText = (data: FormData, key: string) =>
  String(data.get(key) ?? '').trim();
