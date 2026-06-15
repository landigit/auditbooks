import {
  showToast as originalShowToast,
  showDialog as originalShowDialog,
} from '../utils/interactive';
import type { ToastOptions, DialogOptions } from '../utils/types';

export function useToast() {
  return {
    showToast: (options: ToastOptions) => originalShowToast(options),
    showDialog: <DO extends DialogOptions>(options: DO) =>
      originalShowDialog(options),
  };
}
