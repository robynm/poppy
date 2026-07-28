/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Most color classes are full literal strings (the `tones`/`toneMap` objects),
  // so they're statically extractable. The safelist covers the few that are built
  // dynamically (e.g. AboutModal's `bg-${tone}-50`, `text-${tone}-600/700`).
  safelist: [
    {
      pattern:
        /^(bg|text|border)-(poppy|cream|ink|buttercup|leaf|petal|sky2|plum)-(50|100|200|300|400|500|600|700|800|900)$/,
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', '-apple-system', 'system-ui', 'sans-serif'],
      },
      colors: {
        poppy: { 50: 'var(--poppy-50)', 100: 'var(--poppy-100)', 200: 'var(--poppy-200)', 300: 'var(--poppy-300)', 400: 'var(--poppy-400)', 500: 'var(--poppy-500)', 600: 'var(--poppy-600)', 700: 'var(--poppy-700)', 800: 'var(--poppy-800)', 900: 'var(--poppy-900)' },
        cream: { 50: 'var(--cream-50)', 100: 'var(--cream-100)', 200: 'var(--cream-200)', 300: 'var(--cream-300)', 400: 'var(--cream-400)', 500: 'var(--cream-500)', 600: 'var(--cream-600)', 700: 'var(--cream-700)' },
        ink: { 50: 'var(--ink-50)', 100: 'var(--ink-100)', 200: 'var(--ink-200)', 300: 'var(--ink-300)', 400: 'var(--ink-400)', 500: 'var(--ink-500)', 600: 'var(--ink-600)', 700: 'var(--ink-700)', 800: 'var(--ink-800)', 900: 'var(--ink-900)' },
        buttercup: { 50: 'var(--buttercup-50)', 100: 'var(--buttercup-100)', 200: 'var(--buttercup-200)', 300: 'var(--buttercup-300)', 400: 'var(--buttercup-400)', 500: 'var(--buttercup-500)', 600: 'var(--buttercup-600)', 700: 'var(--buttercup-700)' },
        leaf: { 50: 'var(--leaf-50)', 100: 'var(--leaf-100)', 200: 'var(--leaf-200)', 300: 'var(--leaf-300)', 400: 'var(--leaf-400)', 500: 'var(--leaf-500)', 600: 'var(--leaf-600)', 700: 'var(--leaf-700)' },
        petal: { 50: 'var(--petal-50)', 100: 'var(--petal-100)', 200: 'var(--petal-200)', 300: 'var(--petal-300)', 400: 'var(--petal-400)', 500: 'var(--petal-500)', 600: 'var(--petal-600)', 700: 'var(--petal-700)' },
        sky2: { 50: 'var(--sky2-50)', 100: 'var(--sky2-100)', 200: 'var(--sky2-200)', 300: 'var(--sky2-300)', 400: 'var(--sky2-400)', 500: 'var(--sky2-500)', 600: 'var(--sky2-600)', 700: 'var(--sky2-700)' },
        plum: { 50: 'var(--plum-50)', 100: 'var(--plum-100)', 200: 'var(--plum-200)', 300: 'var(--plum-300)', 400: 'var(--plum-400)', 500: 'var(--plum-500)', 600: 'var(--plum-600)', 700: 'var(--plum-700)' },
      },
      boxShadow: {
        poppy: 'var(--shadow-poppy)',
        card: 'var(--shadow-card)',
        'card-hi': 'var(--shadow-card-hi)',
        pop: 'var(--shadow-pop)',
      },
      borderRadius: {
        xl2: '1.125rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
