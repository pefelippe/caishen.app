/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@caishen/theme/tailwind-preset")],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
