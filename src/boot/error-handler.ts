import { boot } from "quasar/wrappers";
import { handleError, sendError } from "src/errorHandling";
import { stringifyCircular } from "src/utils";
import type { UnexpectedLogObject } from "src/utils/types";
import { CUSTOM_EVENTS } from "utils/messages";
import type { App } from "vue";

export default boot(({ app }: { app: App }) => {
	// 1. Window Errors
	window.onerror = (message, source, lineno, colno, error) => {
		const err = error ?? new Error("triggered in window.onerror");
		handleError(true, err, { message, source, lineno, colno });
	};

	// 2. Unhandled Rejections
	window.onunhandledrejection = (event: PromiseRejectionEvent) => {
		const error =
			event.reason instanceof Error
				? event.reason
				: new Error(String(event.reason));
		handleError(true, error).catch((err) => console.error(err));
	};

	// 3. Unexpected Logs
	window.addEventListener(CUSTOM_EVENTS.LOG_UNEXPECTED, (event) => {
		const details = (event as CustomEvent)?.detail as UnexpectedLogObject;
		sendError(details);
	});

	// 4. Vue Component Errors
	app.config.errorHandler = (err, vm, info) => {
		const more: Record<string, unknown> = { info };
		if (vm) {
			const { fullPath, params } = vm.$route;
			more.fullPath = fullPath;
			more.params = stringifyCircular(params ?? {});
			more.props = stringifyCircular(vm.$props ?? {}, true, true);
		}
		handleError(false, err as Error, more);
		console.error(err, vm, info);
	};
});
