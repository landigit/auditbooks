import { App } from "vue";
import { Router } from "vue-router";

declare module "quasar/wrappers" {
	export interface BootFileParams {
		app: App;
		router: Router;
		store: any;
	}
	export function boot(
		callback: (params: BootFileParams) => void | Promise<void>,
	): any;
}
