import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  // @ts-ignore
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@dlient/lakex-doc-react': new URL('../src', import.meta.url).pathname,
    },
  },
});