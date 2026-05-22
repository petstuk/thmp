import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Browser uses same-origin `/api/...`; Vite forwards to the gateway (Traefik on :80). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.DEV_PROXY_TARGET || 'http://127.0.0.1:80'
  /** User-service origin for integration CRUD when Traefik omits that route (Compose: http://user-service:8000). */
  const userServiceProxy = env.VITE_USER_SERVICE_PROXY || 'http://127.0.0.1:8001'

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      // More specific prefixes must appear first: Vite matches the first `startsWith` context.
      proxy: {
        '/api/v1/integrations': {
          target: userServiceProxy,
          changeOrigin: true,
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
