import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 数据源在仓库根的 /data 下,允许从 src 之外引入 JSON。
export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: ['..', '.'] },
  },
})
