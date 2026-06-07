import { describe, expect, it, beforeEach } from 'vitest';
import { useAppStore } from 'src/stores/app';
import { setActivePinia, createPinia } from 'pinia';

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default values', () => {
    const store = useAppStore();
    expect(store.platform).toBe('Linux');
    expect(store.showSidebar).toBe(true);
    expect(store.theme).toBe('auto');
    expect(store.language).toBe('English');
    expect(store.languageDirection).toBe('ltr');
  });

  it('setPlatform maps win32 to Windows', () => {
    const store = useAppStore();
    store.setPlatform('win32');
    expect(store.platform).toBe('Windows');
  });

  it('setPlatform maps darwin to Mac', () => {
    const store = useAppStore();
    store.setPlatform('darwin');
    expect(store.platform).toBe('Mac');
  });

  it('toggleSidebar flips showSidebar', () => {
    const store = useAppStore();
    expect(store.showSidebar).toBe(true);
    store.toggleSidebar();
    expect(store.showSidebar).toBe(false);
    store.toggleSidebar();
    expect(store.showSidebar).toBe(true);
  });

  it('theme property updates theme', () => {
    const store = useAppStore();
    store.theme = 'dark';
    expect(store.theme).toBe('dark');
    store.theme = 'light';
    expect(store.theme).toBe('light');
    store.theme = 'auto';
    expect(store.theme).toBe('auto');
  });
});
