import { boot } from "quasar/wrappers";
import Badge from "src/components/Badge.vue";
import FeatherIcon from "src/components/FeatherIcon.vue";
import { outsideClickDirective } from "src/renderer/helpers";
import type { App } from "vue";

export default boot(({ app }: { app: App }) => {
	// Global Components
	app.component("FeatherIcon", FeatherIcon);
	app.component("Badge", Badge);

	// Directives
	app.directive("on-outside-click", outsideClickDirective);
});
