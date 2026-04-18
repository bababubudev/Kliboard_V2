const config = {
  plugins: {
    "@tailwindcss/postcss": {
      optimize: { minify: false },
      browsers: ">= 0.5%, last 4 versions, not dead",
    },
  },
};

export default config;
