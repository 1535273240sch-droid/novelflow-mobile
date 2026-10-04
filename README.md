# NovelFlow Mobile（手机版）

[NovelFlow 桌面版](https://github.com/1535273240sch-droid/novelflow) 的 **手机原生版**：同一套 React + TypeScript + Tailwind CSS 4 主题（slate 灰白底 / blue-600 主按钮 / 同款中文字体栈），用 **Capacitor** 封装为原生 Android App，可在 GitHub Actions 内一键构建出 **APK**。

> 当前对齐桌面版 **M1 里程碑**：项目管理、模型预设、角色映射、流式试写、编辑器、一键复制。

## 功能（与桌面版对齐）

- **项目管理**：新建/切换/删除项目（保存在本机设备存储），生成与桌面版完全一致的标准结构：
  `novel.json`、`bible/`（概述/世界观/人物/主线与卷纲/文风规范/时间线）、`outline/`、`chapters/`、`state/`（characters/foreshadowing/events）
- **备份迁移**：一键导出/导入项目备份 JSON（等价桌面版整个项目文件夹，可直接人工阅读）
- **模型预设**：任意数量预设的增删改；协议 openai-compatible / anthropic；「测试连接」显示成功延迟或失败原因
- **内置演示模型**：`local-demo` 协议，不出网本地“吐字”，没有真实 Key 也能体验完整流式写作
- **模型角色映射**：规划/写作/检查/润色 四个角色分别指向某预设（试写默认用写作模型）
- **LLM 调用层**（移植自桌面版 main 进程）：SSE 流式（双协议）、连接/空闲超时、429/5xx/超时指数退避重试（最多 3 次）、并发限制（默认 2）、流式节流（默认 80ms）、随时取消
- **编辑器**：移动端 textarea（同桌面版字号 15px / 行高 1.9 / 白底视觉），按章加载，3.5 秒自动保存（可调），字数统计
- **一键复制**：复制全文，提示「已复制 N 字」
- **手机适配**：底部三栏导航（项目/写作/试写）、Bottom Sheet 弹层、安全区适配、点按态反馈

## 安全说明（如实）

- 密钥仅保存在本机设备存储中，不随内容上传；设置页可查看脱敏提示（`sk-***abcd`）
- 未勾选「记住密钥」时，Key 仅本次会话有效（与桌面版 Linux 无加密时的策略一致）
- 桌面版使用 Electron safeStorage 加密；手机版 WebView 无系统级密钥库，属已知差异
- 接入云端服务时 Key 会随请求发给所填 base_url 服务商；测试请优先用内置演示模型

## 本地开发

要求：Node.js >= 20。

```bash
npm install
npm run dev        # 浏览器打开（Vite）
npm run build      # tsc 类型检查 + vite 构建 → dist/
npm run icons      # 重新生成 App 图标（零依赖 PNG 编码）
```

## 构建 Android APK

### 本地（需 Android Studio / JDK 21 / Android SDK）

```bash
npm run build
npx cap add android      # 首次；仓库内已提交生成的 android/ 工程可跳过
npx cap sync android
cd android && ./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

### CI（GitHub Actions，无需本地环境）

推送或手动触发仓库的 **构建打包** workflow：

- `android-apk` job：Node 构建 → `cap sync` → Temurin 21 + Gradle `assembleDebug` → 产物 **NovelFlow-Android-APK**（Debug 签名，可直接安装）
- `web-preview` job：同一套 UI 发布到 GitHub Pages，手机浏览器可直接体验

Debug APK 未做发布签名；正式发布请在 `android/app/build.gradle` 配置 keystore 后跑 `assembleRelease`。

## 与桌面版的差异（如实）

| 差异点 | 桌面版 | 手机版 |
| --- | --- | --- |
| 运行环境 | Electron 主进程 + 渲染进程 | Capacitor 原生壳 + WebView |
| 项目存储 | 真实文件夹（可读可备份） | 本机设备存储内虚拟文件夹 + 备份 JSON 导出/导入 |
| 密钥存储 | safeStorage 加密落盘 | 本机设备存储（卸载即清除） |
| 编辑器 | CodeMirror 6 | 原生 textarea（触屏输入法更稳，视觉同款） |
| mock 联调 | `npm run mock` 起本地服务 | 内置 local-demo 演示模型，离线可用 |

## 依赖

运行时：react / react-dom / zustand / @capacitor(core+android)。开发：vite / typescript / tailwindcss v4 / @capacitor/cli。全部 MIT，无闭源依赖。
