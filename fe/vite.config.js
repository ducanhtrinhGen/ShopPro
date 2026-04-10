var _a;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var backendPort = (_a = process.env.SHOPPRO_BE_PORT) !== null && _a !== void 0 ? _a : "8080";
var backendTarget = "http://localhost:".concat(backendPort);
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
