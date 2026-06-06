import { t } from "fyo";
import { getColorClass } from "./colors.js";
import {
  DialogButton,
  DialogOptions,
  ToastOptions,
  ToastType,
} from "./types.js";

// Detect Lynx native environment
export const isLynx =
  typeof globalThis !== "undefined" &&
  ((globalThis as any).lynx ||
    (typeof process !== "undefined" && process.env && process.env.BACKEND_IP));

export async function showDialog<DO extends DialogOptions>(
  options: DO,
): Promise<any> {
  if (isLynx) {
    console.info(
      `[Lynx Dialog] Title: ${options.title}, Detail: ${options.detail}`,
    );
    if (options.buttons && options.buttons.length > 0) {
      const primaryBtn =
        options.buttons.find((b) => b.isPrimary) || options.buttons[0];
      if (primaryBtn && typeof primaryBtn.action === "function") {
        return await primaryBtn.action();
      }
    }
    return null;
  }

  const Dialog = (await import("src/components/Dialog.vue")).default;
  const { createApp, h } = await import("vue");

  const preWrappedButtons: DialogButton[] = options.buttons ?? [
    { label: t`Okay`, action: () => null, isEscape: true },
  ];

  const resultPromise = new Promise((resolve, reject) => {
    const buttons = preWrappedButtons.map((config) => {
      return {
        ...config,
        action: async () => {
          try {
            resolve(await config.action());
          } catch (error) {
            reject(error);
          }
        },
      };
    });

    const dialogApp = createApp({
      render() {
        return h(Dialog, { ...options, buttons });
      },
    });

    fragmentMountComponent(dialogApp);
  });

  return await resultPromise;
}

export async function showToast(options: ToastOptions) {
  if (isLynx) {
    console.info(`[Lynx Toast] Message: ${options.message}`);
    return;
  }

  const Toast = (await import("src/components/Toast.vue")).default;
  const { createApp, h } = await import("vue");

  const toastApp = createApp({
    render() {
      return h(Toast, { ...options });
    },
  });

  fragmentMountComponent(toastApp);
}

function fragmentMountComponent(app: any) {
  if (typeof document === "undefined") {
    return;
  }
  const fragment = document.createDocumentFragment();
  app.mount(fragment);
  document.body.append(fragment);
}

export function getIconConfig(type: ToastType) {
  let iconName = "alert-circle";
  if (type === "warning") {
    iconName = "alert-triangle";
  } else if (type === "success") {
    iconName = "check-circle";
  }

  const color = {
    info: "blue",
    warning: "orange",
    error: "red",
    success: "green",
  }[type];

  const iconColor = getColorClass(color ?? "gray", "text");
  const containerBackground = getColorClass(color ?? "gray", "bg");
  const containerBorder = getColorClass(color ?? "gray", "border");

  return { iconName, color, iconColor, containerBorder, containerBackground };
}
