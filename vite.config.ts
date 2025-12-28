import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import path from 'path';

// 自定义插件：移除 HTML 中的 crossorigin 属性（解决 Electron file:// 协议跨域问题）
function removeCrossorigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '');
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  // Electron 需要使用相对路径加载资源
  const base = './';

  // 生产环境默认不输出 sourcemap，避免源码泄露；如需排查问题可显式开启
  const enableSourceMap = env.VITE_SOURCEMAP === 'true';

  // 默认开启代码分割以改善首屏性能；如需保持"单文件"（例如排查 file:// 兼容性）可显式设置为 false
  const enableCodeSplitting = env.VITE_ENABLE_CODE_SPLITTING !== 'false';

  // 生产环境默认不注入第三方徽标（避免不必要的外链与合规风险）
  const enableTraeBadge = env.VITE_ENABLE_TRAE_BADGE === 'true';

  const plugins = [
    react({
      babel: {
        // 仅开发环境启用定位插件，避免生产包体积/运行时开销
        plugins: isProd ? [] : ['react-dev-locator'],
      },
    }),
    tsconfigPaths(),
    // 生产环境移除 crossorigin 属性，解决 Electron file:// 协议问题
    isProd && removeCrossorigin(),
  ].filter(Boolean);

  if (enableTraeBadge) {
    plugins.push(
      traeBadgePlugin({
        variant: 'dark',
        position: 'bottom-right',
        prodOnly: true,
        clickable: true,
        clickUrl: 'https://www.trae.ai/solo?showJoin=1',
        autoTheme: true,
        autoThemeTarget: '#root',
      }),
    );
  }

  return {
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      sourcemap: enableSourceMap ? 'hidden' : false,
      // 确保资源路径正确
      assetsDir: 'assets',
      // Electron file:// 协议下 modulePreload 的 crossorigin 会导致跨域错误，禁用它
      modulePreload: false,
      rollupOptions: enableCodeSplitting
        ? {
            output: {
              manualChunks: (id) => {
                // 说明：Windows 下路径可能包含反斜杠，这里做一次归一化，避免规则失效
                const normalizedId = id.replace(/\\/g, '/');
                if (!normalizedId.includes('/node_modules/')) return undefined;

                // React 核心与路由：严格匹配包路径，避免把 "xxx-react" 类库误归到 react chunk 里
                if (normalizedId.includes('/node_modules/react/')) return 'vendor-react';
                if (normalizedId.includes('/node_modules/react-dom/')) return 'vendor-react';
                if (normalizedId.includes('/node_modules/react-router/')) return 'vendor-router';
                if (normalizedId.includes('/node_modules/react-router-dom/')) return 'vendor-router';

                // UI/图标类：独立出来，减少核心 chunk 体积
                if (normalizedId.includes('/node_modules/@headlessui/')) return 'vendor-ui';
                if (normalizedId.includes('/node_modules/@heroicons/')) return 'vendor-ui';
                if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-ui';
                if (normalizedId.includes('/node_modules/react-hot-toast/')) return 'vendor-ui';

                if (normalizedId.includes('/node_modules/@supabase/')) return 'vendor-supabase';
                if (normalizedId.includes('/node_modules/recharts/') || normalizedId.includes('/node_modules/d3-')) return 'vendor-charts';
                if (normalizedId.includes('/node_modules/xlsx/') || normalizedId.includes('/node_modules/file-saver/')) return 'vendor-export';
                return 'vendor';
              },
            },
          }
        : {
            output: {
              // 说明：显式禁用手动分包策略，便于输出尽可能少的 chunk
              manualChunks: undefined,
            },
          },
    },
    plugins,
  };
});
