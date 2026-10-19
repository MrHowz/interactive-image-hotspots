import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), ...(mode === "https" ? [basicSsl()] : [])],
  build: {
    rollupOptions: {
      input: { main: "index.html", background: "background.html" },
    },
  },
}));
