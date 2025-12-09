/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'oklch(var(--b1) / <alpha-value>)',
        surface: 'oklch(var(--b2) / <alpha-value>)',
        'surface-light': 'oklch(var(--b3) / <alpha-value>)',
        primary: 'oklch(var(--bc) / <alpha-value>)',
        secondary: 'oklch(var(--bc) / 0.6)',
        border: 'oklch(var(--bc) / 0.2)',
        'border-light': 'oklch(var(--bc) / 0.1)',
      },
      fontFamily: {
        pixel: ['"Chill Pixels Mono"', '"Pixel32"', 'ui-sans-serif', 'system-ui'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter", "dim", "nord", "sunset"
    ],
  },
}
