import { defineConfig } from 'vite'

/**
 * - 默认 `base: './'`：构建出的 `dist/` 可用相对路径部署在任意子目录。
 * - 端口用 5190，避开基座项目的 5180。
 */
const base = process.env.VITE_BASE ?? './'

export default defineConfig({
  base,
  server: {
    port: Number(process.env.VITE_DEV_PORT) || 5190,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
})
