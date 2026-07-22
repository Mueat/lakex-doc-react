import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library build for `@dlient/lakex-doc-react`.
// Only `react` / `react-dom` are externalized so the consumer's single React
// instance is reused (the lakex framework is built against React 18 and must
// NOT be paired with a second React copy).
//
// `@xiangfa/mindmap` is intentionally NOT externalized: its package.json lists
// `react: ^19` in `dependencies` (in addition to `peerDependencies`), which
// causes npm to nest-install react@19 under @xiangfa/mindmap on the consumer
// side. That second React instance triggers "Invalid hook call". Bundling
// mindmap into our output makes its `import … from "react"` resolve to the
// externalized (consumer-provided) React, guaranteeing a single instance.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format: string) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
      output: {
        assetFileNames: 'style.css',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOMClient',
        },
        inlineDynamicImports: true,
      },
    },
    // The framework bundle (lakex.js) is ~9.7 MB; lift the warning threshold.
    chunkSizeWarningLimit: 12000,
  },
});
