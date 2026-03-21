import { createPinia } from "pinia";
import { store } from "quasar/wrappers";

/*
 * When adding a new store at "src/stores", you can use:
 *
 * export const useExampleStore = defineStore('example', { ... })
 *
 * and then import and use it for any component.
 */

export default store(() => {
	const pinia = createPinia();

	// You can add Pinia plugins here
	// pinia.use(SomePiniaPlugin)

	return pinia;
});
