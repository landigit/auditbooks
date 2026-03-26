import type { IPC } from "main/preload";
import type Vue from "vue";
import type { VNode } from "vue";

declare global {
	const ipc: IPC;
	namespace JSX {
		type Element = VNode;
		type ElementClass = Vue;
		interface IntrinsicElements {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			[elem: string]: any;
		}
	}

	interface Window {
		ipc: IPC;
	}
}
