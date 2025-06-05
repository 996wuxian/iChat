// electron.vite.config.ts
import path, { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import UnoCSS from "unocss/vite";
import { createSvgIconsPlugin } from "vite-plugin-svg-icons";
var __electron_vite_injected_dirname = "X:\\1-temp\\temp-v3-ts-vite-electron";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: true,
      rollupOptions: {
        external: ["electron"],
        output: {
          format: "cjs",
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]"
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: true,
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]"
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve(__electron_vite_injected_dirname, "./src/renderer/src")
      }
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            whitespace: "condense"
          }
        }
      }),
      UnoCSS(),
      createSvgIconsPlugin({
        // 指定需要缓存的图标文件夹
        iconDirs: [path.resolve(process.cwd(), "src/renderer/src/assets/svgs")],
        // 指定symbolId格式
        symbolId: "[name]"
      }),
      AutoImport({
        imports: ["vue"],
        dts: "src/auto-imports.d.ts",
        eslintrc: {
          enabled: true,
          // 确保这个选项是 true
          filepath: "./.eslintrc-auto-import.json",
          // 可以指定生成的文件路径
          globalsPropValue: true
          // 设置全局变量的属性值
        }
      }),
      Components({
        resolvers: [NaiveUiResolver()],
        dts: true
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@renderer/assets/sass/global.scss" as *;`
        }
      }
    },
    define: {
      __dirname: JSON.stringify(__electron_vite_injected_dirname)
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:9528/api/",
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/api/, "")
        }
      }
    },
    build: {
      minify: "esbuild",
      // 使用 esbuild 进行压缩
      target: "esnext",
      // 设置目标环境
      cssTarget: "chrome61",
      // CSS 兼容性设置
      chunkSizeWarningLimit: 1e3,
      cssCodeSplit: true,
      // 启用 CSS 代码分割
      sourcemap: false,
      // 禁用 sourcemap
      rollupOptions: {
        output: {
          manualChunks: {
            "naive-ui": ["naive-ui"],
            "vue-vendor": ["vue", "vue-router", "pinia"],
            vendor: [
              // 其他第三方库
            ]
          },
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
