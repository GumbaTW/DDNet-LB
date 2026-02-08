import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/DDNet-LB/', // required for GitHub Pages project site (https://<user>.github.io/DDNet-LB/)
  plugins: [react()],
})
