import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'text-strong': 'var(--color-text-strong)',
        'text-body': 'var(--color-text-body)',
        'text-muted': 'var(--color-text-muted)',
        'text-subtle': 'var(--color-text-subtle)',
        'text-disabled': 'var(--color-text-disabled)',
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        'invert-bg': 'var(--color-invert-bg)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        'border-subtle': 'var(--color-border-subtle)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-soft': 'var(--color-accent-soft)',
        danger: 'var(--color-danger)',
        'danger-hover': 'var(--color-danger-hover)',
        'danger-soft': 'var(--color-danger-soft)',
        success: 'var(--color-success)',
        'success-hover': 'var(--color-success-hover)',
        'success-soft': 'var(--color-success-soft)',
        warning: 'var(--color-warning)',
        'warning-hover': 'var(--color-warning-hover)',
        'warning-soft': 'var(--color-warning-soft)',
        info: 'var(--color-info)',
        'info-hover': 'var(--color-info-hover)',
        'info-soft': 'var(--color-info-soft)',
      },
    },
  },
  plugins: [],
}

export default config
