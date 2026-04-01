/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"], // Chỉ đường dẫn tới file html của bạn
  theme: {
    extend: {
      colors: {
        "primary": "#0ea5e9",
        "background-light": "#f0f9ff",
        "background-dark": "#0c4a6e",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "20": "20px", // Bạn có thể dùng rounded-20 thay vì rounded-[20px]
      }
    },
  },
  plugins: [],
}