import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { build } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempOutDir = path.resolve(rootDir, '.standalone-dist');
const outputHtmlPath = path.resolve(rootDir, 'public', 'AtelierFix-Autonome.html');

async function buildStandalone() {
  if (fs.existsSync(tempOutDir)) {
    fs.rmSync(tempOutDir, { recursive: true, force: true });
  }

  await build({
    root: rootDir,
    configFile: false,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
        'virtual:pwa-register': path.resolve(rootDir, 'src', 'lib', 'pwaShim.ts'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir: tempOutDir,
      emptyOutDir: true,
      assetsInlineLimit: 10 * 1024 * 1024,
      cssCodeSplit: false,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: path.resolve(rootDir, 'src', 'main.tsx'),
        output: {
          format: 'iife',
          name: 'AtelierFixStandalone',
          inlineDynamicImports: true,
          entryFileNames: 'atelierfix.js',
          assetFileNames: 'atelierfix.[ext]',
        },
      },
    },
    logLevel: 'warn',
  });

  const jsPath = path.resolve(tempOutDir, 'atelierfix.js');
  const cssPath = path.resolve(tempOutDir, 'atelierfix.css');
  const iconSvgPath = path.resolve(rootDir, 'public', 'icon.svg');

  if (!fs.existsSync(jsPath)) {
    throw new Error('Standalone JS bundle was not generated.');
  }

  const rawJs = fs.readFileSync(jsPath, 'utf8').replace(/<\/(script)/gi, '<\\/$1');
  const rawCss = fs.existsSync(cssPath)
    ? fs.readFileSync(cssPath, 'utf8').replace(/<\/(style)/gi, '<\\/$1')
    : '';
  const iconDataUri = fs.existsSync(iconSvgPath)
    ? `data:image/svg+xml;base64,${fs.readFileSync(iconSvgPath).toString('base64')}`
    : '';

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <title>AtelierFix — Version Autonome Prête à l'Emploi</title>
    ${iconDataUri ? `<link rel="icon" type="image/svg+xml" href="${iconDataUri}" />` : ''}
    <script>
      (function () {
        try {
          var saved = localStorage.getItem('atelierfix_theme');
          if (saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          }
        } catch (e) {}
      })();
    </script>
    <style>${rawCss}</style>
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-blue-900 dark:selection:text-blue-100">
    <div id="root"></div>
    <script>${rawJs}</script>
  </body>
</html>
`;

  fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
  fs.writeFileSync(outputHtmlPath, html, 'utf8');
  fs.rmSync(tempOutDir, { recursive: true, force: true });

  const stats = fs.statSync(outputHtmlPath);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`Generated ${outputHtmlPath} (${sizeKb} KB)`);
}

buildStandalone().catch((err) => {
  console.error('Standalone build failed:', err);
  process.exit(1);
});
