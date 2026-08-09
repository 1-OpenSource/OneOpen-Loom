export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}
