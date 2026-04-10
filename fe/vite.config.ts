import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
};

const backendPort = process.env.SHOPPRO_BE_PORT ?? "8080";
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true
      },
      "/products/image": {
        target: backendTarget,
        changeOrigin: true
      },
      "/logout": {
        target: backendTarget,
        changeOrigin: true
      }
    }
  }
});
