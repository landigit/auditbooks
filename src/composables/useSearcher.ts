import { inject } from 'vue';
import { searcherKey } from '../utils/injectionKeys';

export function useSearcher() {
  const searcher = inject(searcherKey);
  return searcher;
}
