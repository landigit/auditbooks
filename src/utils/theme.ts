export function setDarkMode(darkMode: boolean): void {
  if (darkMode) {
    document.documentElement.classList.add(
      'dark',
      'custom-scroll',
      'custom-scroll-thumb1'
    );
    return;
  }
  document.documentElement.classList.remove('dark');
}

export function setFont(font: string | undefined): void {
  const allowedFonts = ['Inter', 'GoogleSansFlex', 'RedHatText'];

  if (!font || !allowedFonts.includes(font)) {
    font = 'GoogleSansFlex';
  }

  // Update the CSS variable for Tailwind
  document.documentElement.style.setProperty('--app-font', font);

  // Also apply directly to the app container
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.style.fontFamily = font;
  }
}
