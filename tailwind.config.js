/** @type {import('tailwindcss').Config} */
export default {
  // 扫描所有 html 与 src 下的 js/jsx，保证用到的类被生成
  content: [
    './index.html',
    './settings.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
