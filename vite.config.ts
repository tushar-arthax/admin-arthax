import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .env files reach the app through import.meta.env, but not this config's
  // process.env — so they are loaded here explicitly.
  const env = loadEnv(mode, process.cwd(), "");

  return {
  server: {
    host: "::",
    port: 8081,
    hmr: {
      overlay: false,
    },
    // Dev only: forward API calls to a remote backend so the browser never
    // makes a cross-origin request. Set VITE_PROXY_TARGET in .env.local.
    proxy: env.VITE_PROXY_TARGET
      ? {
          "/api": {
            target: env.VITE_PROXY_TARGET,
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              // Production only accepts Origins it knows; drop the localhost one.
              proxy.on("proxyReq", (req) => req.removeHeader("origin"));
            },
          },
        }
      : undefined,
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  };
});
