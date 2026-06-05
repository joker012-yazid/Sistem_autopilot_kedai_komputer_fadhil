import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--line)',
        input: 'var(--line)',
        ring: 'var(--primary)',
        background: 'var(--bg)',
        foreground: 'var(--ink)',
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'var(--panel-soft)',
          foreground: 'var(--ink)',
        },
        destructive: {
          DEFAULT: 'var(--red)',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: 'var(--panel-soft)',
          foreground: 'var(--muted)',
        },
        accent: {
          DEFAULT: 'var(--panel-soft)',
          foreground: 'var(--ink)',
        },
        popover: {
          DEFAULT: 'var(--panel)',
          foreground: 'var(--ink)',
        },
        card: {
          DEFAULT: 'var(--panel)',
          foreground: 'var(--ink)',
        },
        // Semantic aliases
        success: 'var(--green)',
        warning: 'var(--amber)',
        danger: 'var(--red)',
        info: 'var(--blue)',
        // Primitive palette references
        teal: 'var(--teal)',
        slate: 'var(--slate)',
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: '#fbf7ef',
          active: 'var(--sidebar-active)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': 'var(--text-xs)',
        xs: 'var(--text-sm)',
        sm: 'var(--text-base)',
        base: 'var(--text-lg)',
        lg: 'var(--text-xl)',
        xl: 'var(--text-2xl)',
        '2xl': 'var(--text-3xl)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        base: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      lineHeight: {
        tight: 'var(--leading-tight)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
