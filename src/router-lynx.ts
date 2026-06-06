import { ref } from 'vue-lynx';

export interface Route {
  name: string;
  params?: Record<string, any>;
}

const historyStack = ref<Route[]>([
  { name: 'DatabaseSelector' }
]);

export const currentRoute = ref<Route>({ name: 'DatabaseSelector' });

export const router = {
  push(name: string, params?: Record<string, any>) {
    const route: Route = { name, params };
    historyStack.value.push(route);
    currentRoute.value = route;
    console.log(`[Router] Navigated to: ${name}`);
  },
  back() {
    if (historyStack.value.length > 1) {
      historyStack.value.pop();
      const prevRoute = historyStack.value[historyStack.value.length - 1];
      currentRoute.value = prevRoute;
      console.log(`[Router] Back to: ${prevRoute.name}`);
    }
  },
  replace(name: string, params?: Record<string, any>) {
    const route: Route = { name, params };
    historyStack.value[historyStack.value.length - 1] = route;
    currentRoute.value = route;
    console.log(`[Router] Replaced with: ${name}`);
  }
};
