import type { Paginated } from './pagination';

export type PreviewList<T> = Paginated<T> & {
  mock: boolean;
};

export function asPreviewList<T>(page: Paginated<T>, mock: boolean): PreviewList<T> {
  return { ...page, mock };
}
