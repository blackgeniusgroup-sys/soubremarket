import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins:[
    react({
      // Force Vite à utiliser le nouveau JSX runtime (comme CRA)
      jsxRuntime: 'automatic'
    }),
    tailwindcss()
  ],
  server: {
    hmr:{
      protocol: 'ws',
      host: 'localhost'
    }
  }
})