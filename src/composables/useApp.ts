import { fyo } from '../initFyo';

export function useApp() {
  return {
    fyo,
    t: fyo.t,
    T: fyo.T,
  };
}
