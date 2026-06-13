const fs = require('fs');
const colors = JSON.parse(
  fs.readFileSync('colors.json', { encoding: 'utf-8' })
);

module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{vue,ts,html}',
    './main/**/*.{vue,ts}',
    './templates/**/*.html',
  ],
  safelist: [
    {
      pattern: /^(bg|text|border)-(gray|orange|red|green|blue|yellow|purple|teal)-(100|200|400|600|700|800)$/,
      variants: ['dark'],
    },
  ],
  theme: {
    fontFamily: {
      sans: ['Figtree Variable', 'Inter', 'sans-serif'],
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '15px',
      xl: '20px',
      '2xl': '22px',
      '3xl': '26px',
      '4xl': '30px',
    },
    extend: {
      maxHeight: {
        64: '16rem',
      },
      minWidth: {
        40: '10rem',
        56: '14rem',
      },
      maxWidth: {
        32: '8rem',
        56: '14rem',
      },
      spacing: {
        7: '1.75rem',
        14: '3.5rem',
        18: '4.5rem',
        28: '7rem',
        72: '18rem',
        80: '20rem',
      },
      boxShadow: {
        'outline-px': '0 0 0 1px rgba(66, 153, 225, 0.5)',
        DEFAULT: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        md: '0 0 2px 0 rgba(0, 0, 0, 0.10), 0 2px 4px 0 rgba(0, 0, 0, 0.08)',
        button: '0 0.5px 0 0 rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.313rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      gridColumn: {
        'span-full': '1 / -1',
      },
      colors: {
        ...colors,
        border: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--border) ${opacityValue * 100}%, transparent)` : 'var(--border)',
        input: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--input) ${opacityValue * 100}%, transparent)` : 'var(--input)',
        ring: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--ring) ${opacityValue * 100}%, transparent)` : 'var(--ring)',
        background: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--background) ${opacityValue * 100}%, transparent)` : 'var(--background)',
        foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--foreground) ${opacityValue * 100}%, transparent)` : 'var(--foreground)',
        primary: {
          DEFAULT: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--primary) ${opacityValue * 100}%, transparent)` : 'var(--primary)',
          foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--primary-foreground) ${opacityValue * 100}%, transparent)` : 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--secondary) ${opacityValue * 100}%, transparent)` : 'var(--secondary)',
          foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--secondary-foreground) ${opacityValue * 100}%, transparent)` : 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--destructive) ${opacityValue * 100}%, transparent)` : 'var(--destructive)',
          foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--destructive-foreground) ${opacityValue * 100}%, transparent)` : 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--muted) ${opacityValue * 100}%, transparent)` : 'var(--muted)',
          foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--muted-foreground) ${opacityValue * 100}%, transparent)` : 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--accent) ${opacityValue * 100}%, transparent)` : 'var(--accent)',
          foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--accent-foreground) ${opacityValue * 100}%, transparent)` : 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--popover) ${opacityValue * 100}%, transparent)` : 'var(--popover)',
          foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--popover-foreground) ${opacityValue * 100}%, transparent)` : 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--card) ${opacityValue * 100}%, transparent)` : 'var(--card)',
          foreground: ({ opacityValue }) => opacityValue !== undefined ? `color-mix(in srgb, var(--card-foreground) ${opacityValue * 100}%, transparent)` : 'var(--card-foreground)',
        },
      },
    },
  },
  plugins: [require('tailwindcss-rtl')],
};

/*
 * 208, 100, 50
 * 209,  62, 50
 */
