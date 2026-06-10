import { config } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';

// Install Pinia globally for all tests
beforeEach(() => {
  setActivePinia(createPinia());
});

// Optional: global component stubs
config.global.stubs = {
  teleport: true,
};
