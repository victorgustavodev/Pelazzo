export interface Actor {
  id: string;
  displayName: string;
  email: string;
}
export interface Paging {
  page: number;
  limit: number;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface Runtime {
  id(): string;
  now(): Date;
  token(): string;
  hash(value: string): string;
  randomInt(maxExclusive: number): number;
}
export const RUNTIME = Symbol('RUNTIME');
