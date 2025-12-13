import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  // Electron 需要使用相对路径加载资源
  const base = './';

  // 生产环境默认不输出 sourcemap，避免源码泄露；如需排查问题可显式开启
  const enableSourceMap = env.VITE_SOURCEMAP === 'true';

  // 默认保持“单文件”以降低 Electron file:// 加载复杂度；如需优化首屏可开启代码分割
  const enableCodeSplitting = env.VITE_ENABLE_CODE_SPLITTING === 'true';

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
  ];

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
    build: {
      sourcemap: enableSourceMap ? 'hidden' : false,
      // 确保资源路径正确
      assetsDir: 'assets',
      // 禁用代码分割（输出单一 chunk），简化 Electron 加载；开启后由 Vite/Rollup 默认策略分块
      ...(enableCodeSplitting
        ? {}
        : {
            rollupOptions: {
              output: {
                manualChunks: undefined,
              },
            },
          }),
    },
    plugins,
  };
});
