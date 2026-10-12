import { invalid } from './errors.js';
export function text(
  value: unknown,
  label: string,
  min = 1,
  max = 120,
): string {
  if (typeof value !== 'string') return invalid(`${label} deve ser texto.`);
  const result = value.trim();
  if (result.length < min || result.length > max)
    return invalid(`${label} deve ter entre ${min} e ${max} caracteres.`);
  return result;
}
export function choice<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) return invalid(`${label} inválido.`);
  return value as T;
}
export function amount(value: unknown): number {
  if (
    !Number.isInteger(value) ||
    (value as number) <= 0 ||
    (value as number) > 2147483647
  )
    return invalid(
      'Valor deve ser inteiro positivo em centavos, até 2147483647.',
    );
  return value as number;
}
export function date(value: string): Date {
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) return invalid('Data inválida.');
  return result;
}
export function paging(value: { page: number; limit: number }): void {
  if (
    !Number.isInteger(value.page) ||
    value.page < 1 ||
    value.page > 1000000 ||
    !Number.isInteger(value.limit) ||
    value.limit < 1 ||
    value.limit > 100
  )
    invalid('Paginação inválida.');
}
