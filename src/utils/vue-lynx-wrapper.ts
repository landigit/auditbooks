export * from 'vue-lynx';

// Polyfill mergeDefaults which is imported by reka-ui but missing in vue-lynx runtime
export function mergeDefaults(rawProps: any, defaults: any) {
  const props = { ...rawProps };
  for (const key in defaults) {
    if (props[key] === undefined) {
      props[key] = defaults[key];
    }
  }
  return props;
}
