// @remold-ui/vue: thin Vue bindings. Use as a directive: <div v-remold>.
import type { ObjectDirective } from "vue";

const tracked = new WeakSet<Element>();

/** Registers the element so later lessons can measure and animate it. */
export const vRemold: ObjectDirective<Element> = {
  mounted(el) {
    tracked.add(el);
  },
  unmounted(el) {
    tracked.delete(el);
  },
};

export const isTracked = (el: Element) => tracked.has(el);
