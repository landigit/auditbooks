import { onMounted, onUnmounted } from 'vue';
import { fyo } from '../initFyo';

export function useDocEvent(event: string, callback: (...args: any[]) => void, useDb = false) {
  const observer = useDb ? fyo.db.observer : fyo.doc.observer;

  onMounted(() => {
    observer.on(event, callback);
  });

  onUnmounted(() => {
    observer.off(event, callback);
  });
}
