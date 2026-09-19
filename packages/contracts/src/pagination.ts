export type PageQuery = {
  page: number;
  pageSize: number;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

export function parsePageQuery(input: {
  page?: string | number;
  pageSize?: string | number;
}): PageQuery {
  const page = toInt(input.page, DEFAULT_PAGE);
  const pageSize = toInt(input.pageSize, DEFAULT_PAGE_SIZE);
  return {
    page: Math.max(1, page),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)),
  };
}

export function paginate<T>(items: T[], query: PageQuery): Paginated<T> {
  const start = (query.page - 1) * query.pageSize;
  return {
    items: items.slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total: items.length,
  };
}

function toInt(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return Math.trunc(n);
    }
  }
  return fallback;
}
