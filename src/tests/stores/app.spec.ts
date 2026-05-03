import { describe, expect, it } from 'vitest';
import { useAppStore } from 'src/stores/app';

describe('useAppStore', () => {
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

  it('setTheme updates theme', () => {
    const store = useAppStore();
    store.setTheme('dark');
    expect(store.theme).toBe('dark');
    store.setTheme('light');
    expect(store.theme).toBe('light');
    store.setTheme('auto');
    expect(store.theme).toBe('auto');
  });
});
