import { route } from "quasar/wrappers";
import { historyState } from "src/utils/refs";
import {
	createMemoryHistory,
	createRouter,
	createWebHashHistory,
	createWebHistory,
	type HistoryState,
} from "vue-router";
import routes from "./routes";

let router: ReturnType<typeof createRouter>;

export default route((/* { store, ssrContext } */) => {
	const createHistory = process.env.SERVER
		? createMemoryHistory
		: process.env.VUE_ROUTER_MODE === "history"
			? createWebHistory
			: createWebHashHistory;

	const RouterInstance = createRouter({
		scrollBehavior: () => ({ left: 0, top: 0 }),
		routes,
		history: createHistory(process.env.VUE_ROUTER_BASE),
	});

	router = RouterInstance;

	RouterInstance.afterEach(({ fullPath }) => {
		const state = history.state as HistoryState;
		historyState.forward = !!state.forward;
		historyState.back = !!state.back;

		if (fullPath.includes("index.html")) {
			return;
		}

		localStorage.setItem("lastRoute", fullPath);
	});

	return RouterInstance;
});

export { router };
