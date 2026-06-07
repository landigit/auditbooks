import { handleError } from "src/errorHandling";
import { fyo, ipc } from "src/initFyo";
import { syncDocumentsToERPNext } from "src/utils/erpnextSync";
import { useAppStore } from "src/stores/app";

export default function registerIpcRendererListeners() {
  ipc.registerMainProcessErrorListener((...args: unknown[]) => {
    const [, error, more_] = args;
    let more = more_ as Record<string, unknown> | undefined;
    if (!(error instanceof Error)) {
      throw error;
    }

    if (!more) {
      more = {};
    }

    if (typeof more !== "object") {
      more = { more };
    }

    more.isMainProcess = true;
    more.notifyUser ??= true;

    // oxlint-disable-next-line @typescript-eslint/no-floating-promises
    handleError(true, error, more, !!more.notifyUser);
  });

  // oxlint-disable-next-line @typescript-eslint/no-misused-promises
  ipc.registerTriggerFrontendActionListener(async () => {
    await syncDocumentsToERPNext(fyo);
  });

  ipc.registerConsoleLogListener((_, ...stuff: unknown[]) => {
    const store = useAppStore();
    if (!store.isDevelopment) {
      return;
    }

    if (store.isDevelopment) {
      // oxlint-disable-next-line no-console
      console.log(...stuff);
    }
  });

  document.addEventListener("visibilitychange", () => {
    const { visibilityState } = document;
    if (visibilityState === "visible" && !fyo.telemetry.started) {
      // oxlint-disable-next-line @typescript-eslint/no-floating-promises
      fyo.telemetry.start();
    }

    if (visibilityState !== "hidden") {
      return;
    }

    fyo.telemetry.stop();
  });
}
