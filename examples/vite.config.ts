import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      // 构建时发现 lakex-drawnix@0.1.0 的已发布 bundle 仍引用旧的包名 @plait-board/react-board / @plait-board/react-text
      '@dlient/lakex-doc-react': path.resolve(__dirname, '../src'),
      '@plait-board/react-board': 'lakex-drawnix-react-board',
      '@plait-board/react-text': 'lakex-drawnix-react-text',
    },
  },
});
