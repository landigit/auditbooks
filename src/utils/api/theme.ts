export type Theme = 'auto' | 'light' | 'dark';

let themeListener: ((e: MediaQueryListEvent) => void) | null = null;

export function setTheme(theme: Theme): void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // Clean up old listener if it exists
  if (themeListener) {
    mediaQuery.removeEventListener('change', themeListener);
    themeListener = null;
  }

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add(
        'dark',
        'custom-scroll',
        'custom-scroll-thumb1'
      );
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (theme === 'auto') {
    applyTheme(mediaQuery.matches);

    // Add listener for system theme changes
    themeListener = (e: MediaQueryListEvent) => {
      applyTheme(e.matches);
    };
    mediaQuery.addEventListener('change', themeListener);
  } else {
    applyTheme(theme === 'dark');
  }
}

export function setFont(font: string | undefined): void {
  const fontName = font || 'GoogleSansFlex';
  // if (fontName === 'NunitoSans') {
  //   fontName = 'Nunito Sans';
  // }

  // Update the CSS variable for Tailwind
  document.documentElement.style.setProperty('--app-font', fontName);

  // Also apply directly to the app container
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.style.fontFamily = fontName;
  }
}
