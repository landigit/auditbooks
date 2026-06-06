export type Theme = "auto" | "light" | "dark";

let themeListener: ((e: MediaQueryListEvent) => void) | null = null;

export function setTheme(theme: Theme): void {
  const mediaQuery =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  // Clean up old listener if it exists
  if (themeListener && mediaQuery) {
    mediaQuery.removeEventListener("change", themeListener);
    themeListener = null;
  }

  const applyTheme = (isDark: boolean) => {
    if (typeof document !== "undefined") {
      if (isDark) {
        document.documentElement.classList.add(
          "dark",
          "custom-scroll",
          "custom-scroll-thumb1",
        );
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  if (theme === "auto") {
    if (mediaQuery) {
      applyTheme(mediaQuery.matches);

      // Add listener for system theme changes
      themeListener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };
      mediaQuery.addEventListener("change", themeListener);
    }
  } else {
    applyTheme(theme === "dark");
  }
}

export function setFont(font: string | undefined): void {
  const allowedFonts = ["Inter", "GoogleSansFlex", "RedHatText"];

  if (!font || !allowedFonts.includes(font)) {
    font = "GoogleSansFlex";
  }

  if (typeof document !== "undefined") {
    // Update the CSS variable for Tailwind
    document.documentElement.style.setProperty("--app-font", font);

    // Also apply directly to the app container
    const appElement = document.getElementById("app");
    if (appElement) {
      appElement.style.fontFamily = font;
    }
  }
}
