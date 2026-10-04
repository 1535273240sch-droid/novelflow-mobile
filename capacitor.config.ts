import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor 原生壳配置：
 * - webDir 指向 Vite 产物 dist；
 * - allowMixedContent：允许 WebView 内请求 http 本地模型（Ollama/LM Studio 等）。
 */
const config: CapacitorConfig = {
  appId: 'com.novelflow.mobile',
  appName: 'NovelFlow',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
}

export default config
