import { routes } from "vue-router/auto-routes";
import type { HistoryState } from "vue-router";
import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
} from "vue-router";
import { useAppStore } from "./stores/app";

const isLynx =
  typeof globalThis !== "undefined" &&
  ((globalThis as any).lynx ||
    (typeof process !== "undefined" && process.env && process.env.BACKEND_IP));

const router = createRouter({
  routes,
  history: isLynx ? createMemoryHistory() : createWebHistory(),
});

router.afterEach(({ fullPath }) => {
  const appStore = useAppStore();
  const state = history.state as HistoryState;
  appStore.historyState.forward = !!state.forward;
  appStore.historyState.back = !!state.back;

  if (fullPath.includes("index.html")) {
    return;
  }

  localStorage.setItem("lastRoute", fullPath);
});

export default router;
