import { describe, expect, it } from 'vitest';
import { useAppStore } from 'src/stores/app';

describe('useAppStore', () => {
  it('initializes with default values', () => {
    const store = useAppStore();
    expect(store.platform).toBe('Linux');
    expect(store.showSidebar).toBe(true);
    expect(store.darkMode).toBe(false);
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

  it('setDarkMode updates darkMode', () => {
    const store = useAppStore();
    store.setDarkMode(true);
    expect(store.darkMode).toBe(true);
    store.setDarkMode(false);
    expect(store.darkMode).toBe(false);
  });
});
