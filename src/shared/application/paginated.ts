export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

export interface Paginated<T> {
  readonly data: T[];
  readonly meta: PaginationMeta;
}
