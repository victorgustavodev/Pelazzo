import type { Paging, Page } from '../domain/types.js';
export const slice = (query: Paging) => ({
  skip: (query.page - 1) * query.limit,
  take: query.limit,
});
export function page<T>(items: T[], total: number, query: Paging): Page<T> {
  return { items, total, page: query.page, limit: query.limit };
}
