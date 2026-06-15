const fs = require('fs');
const colors = JSON.parse(
  fs.readFileSync('colors.json', { encoding: 'utf-8' })
);
const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      if (typeof opacityValue === 'string' && opacityValue.includes('var(')) {
        return `color-mix(in srgb, var(${variableName}) calc(${opacityValue} * 100%), transparent)`;
      }
      return `color-mix(in srgb, var(${variableName}) ${Number(opacityValue) * 100}%, transparent)`;
    }
    return `var(${variableName})`;
  };
};

module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{vue,ts,html}',
    './main/**/*.{vue,ts}',
    './templates/**/*.html',
  ],
  safelist: [
    {
      pattern:
        /^(bg|text|border)-(gray|orange|red|green|blue|yellow|purple|teal)-(100|200|400|600|700|800)$/,
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
        border: withOpacity('--border'),
        input: withOpacity('--input'),
        ring: withOpacity('--ring'),
        background: withOpacity('--background'),
        foreground: withOpacity('--foreground'),
        primary: {
          DEFAULT: withOpacity('--primary'),
          foreground: withOpacity('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withOpacity('--secondary'),
          foreground: withOpacity('--secondary-foreground'),
        },
        destructive: {
          DEFAULT: withOpacity('--destructive'),
          foreground: withOpacity('--destructive-foreground'),
        },
        muted: {
          DEFAULT: withOpacity('--muted'),
          foreground: withOpacity('--muted-foreground'),
        },
        accent: {
          DEFAULT: withOpacity('--accent'),
          foreground: withOpacity('--accent-foreground'),
        },
        popover: {
          DEFAULT: withOpacity('--popover'),
          foreground: withOpacity('--popover-foreground'),
        },
        card: {
          DEFAULT: withOpacity('--card'),
          foreground: withOpacity('--card-foreground'),
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
