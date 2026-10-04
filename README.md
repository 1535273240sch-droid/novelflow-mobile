# NovelFlow Mobile · 古墨长卷版 (v1.1.0)

> **专门写小说的自动化工作流软件 · 手机原生版**  
> 秉承东方文人雅致风骨，融汇高品质**羊皮卷古墨艺术质感**与现代大模型多阶段自动化流水线体系。

[![构建打包（Web 预览 + Android APK）](https://github.com/1535273240sch-droid/novelflow-mobile/actions/workflows/build.yml/badge.svg)](https://github.com/1535273240sch-droid/novelflow-mobile/actions/workflows/build.yml)
[![Version](https://img.shields.io/badge/version-1.1.0-gold.svg)](package.json)
[![Theme](https://img.shields.io/badge/UI%20Style-%E5%8F%A4%E5%A2%A8%E7%BE%8A%E7%9A%AE%E5%8D%B7%E8%AF%97%E6%84%8F%E9%A3%8E-8c2d19.svg)](src/index.css)

---

## 一、产品定位与核心特色

“笔落惊风雨，诗成泣鬼神。”

NovelFlow Mobile 是专为小说创作者打造的高性能自动化写作终端。通过轻点 6 步底部向导，软件即可自动调度大语言模型走完 **「故事框架 → 章节计划 → 正文初稿 → 错别字检查 → 去 AI 味 → 润色精修」** 完整流水线，最终产出一份**纯净无杂质、一键复制拓印的定稿正文**，并配套提供**独立标题小窗口自动甄选 8 款雅丽书名**。

### 🌟 视觉与交互规范：顶级古墨羊皮卷文艺美学
1. **双重古典意境主题**：
   - **【澄心羊皮卷】（Parchment Scroll）**：温润古雅羊皮底色（`#F5EFE1`）搭配暗金回纹边框与宣纸微浮雕。
   - **【玄砚洒金夜】（Inkstone Dark）**：老坑徽砚玄墨底色（`#151311`）点缀月华玉白字与暗金光芒。
2. **朱砂篆刻印章系统**：开卷、立骨、排篇、挥毫、校勘、洗墨、点金、题签，皆有朱砂赤印烙刻反馈。
3. **东方衬线排版**：精选中文字体栈与线装书式典雅分段，融入古典诗词意境引子。
4. **单手拇指优化**：底部三栏导航、大触控区（≥ 48dp）、平滑 Bottom Sheet 抽屉与触感震动反馈。

---

## 二、工作流总览（7 大核心阶段）

```
[开卷问策向导] 
   ↓
① 立骨安魂（故事框架） 
   ↓
② 排篇布局（章节计划） 
   ↓
③ 秉烛挥毫（正文初稿，逐章流式 + 滚动前情摘要 + 人物状态表） 
   ↓
④ 校勘厘正（错别字检查，自然段落分块 + 修改对照） 
   ↓
⑤ 洗练铅华（去 AI 味，模板套话库精准扫除与文质重构） 
   ↓
⑥ 锦上添花（润色精修，契合选定风格增强意境与文气） 
   ↓
⑦ 洛阳纸贵（纯文本最终正文，一键无损拓印复制）
   └→ 【题签金石：自动生成 8 款候选书名小窗口，点按即拓印】
```

- **提示词解耦**：所有阶段提示词独立保存在 `prompts/` 目录（`01_framework.md` ~ `07_title.md`），绝不硬编码。
- **跨端共用架构**：核心流水线引擎位于 `packages/core`，与电脑端共享数据结构与执行逻辑。
- **长文本分块处理**：错字检查、去 AI 味、润色自动按 1000~1200 字自然段切分处理，单块失败自动重试，不丢数据。
- **断点续写与容灾**：每个阶段、每个分块生成完毕即刻写入本地持久化存储，应用重启后一键继续上次进度。

---

## 三、关键功能详解

### 1. 开卷问策 · 6 步底部抽屉向导
- **题材类型**：都市、玄幻、仙侠、言情、悬疑、科幻、历史、末世、校园或自定义自填。
- **笔法风格**：轻松幽默、热血爽文、细腻文艺、暗黑压抑、甜宠、烧脑反转。
- **男女主角**：默认「林沉」「苏晚」，内置【掷卦·妙赐雅名】AI 随机灵感生成。
- **核心念头**：支持一句话灵感输入，或交由大模型自行演化推演。
- **篇幅规格**：短篇长卷（约3000字）、中篇佳作（约10000字）、连载巨著（每章约2000字）。
- **极简操作**：每步支持【随缘跳过（使用默认）】，最后一步【挥毫立卷 · 开始生成】。

### 2. 题签金石 · 8 候选书名小窗口
- 正文创作完成后**自动弹出**（亦可随时通过悬浮朱砂印章按钮召出）。
- 涵盖 **直白破题型（2个）、悬念引人型（2个）、诗意文艺型（2个）、爆点爽意型（2个）**。
- 每个标题附带 10 字以内一句话核心卖点。
- **轻触即复制**并同步更新作品名；支持【另觅佳题（换一批）】与长按自拟编辑。

### 3. 多模型自由配置与分工指派
- **OpenAI 兼容协议**：支持通义千问、DeepSeek、SiliconFlow、Ollama 等任何标准接口。
- **阶段独立绑定**：写作使用顶配推理模型，校勘与去 AI 味使用快速经济模型。
- **古墨天工模拟**：内置离线演示模型（`local-demo`），无需 API Key 即可完整体验 7 阶段全流程。

### 4. 纯净正文拓印与导出
- **正文净化清洗**：自动剥离大模型开场白（“好的，以下是……”）、Markdown 符号（`#`、`**`）、作者闲话碎语。
- **一键拓印**：纯文本复制到剪切板，粘贴到记事本/备忘录干干净净。
- **导出 TXT**：支持一键生成 `.txt` 典籍文件并支持原生系统分享。

---

## 四、工程与代码目录结构

```
novelflow-mobile/
├── packages/
│   └── core/                     # 跨端工作流引擎（无 DOM 依赖，通用 TypeScript）
│       ├── src/
│       │   ├── types.ts          # 核心数据结构（StoryConfig, Project, Chapter等）
│       │   ├── chunker.ts        # 自然段落切分与重组器
│       │   ├── cleaner.ts        # 正文净化与 JSON 提取器
│       │   ├── deai-words.ts     # 高频 AI 味套话词库
│       │   ├── prompts.ts        # 提示词渲染引擎
│       │   ├── workflow-engine.ts# 7 阶段流水线执行器与断点恢复机
│       │   └── index.ts
│       └── package.json
├── prompts/                      # 独立提示词模板（与电脑端完全共享）
│   ├── 01_framework.md           # ① 故事框架
│   ├── 02_plan.md                # ② 章节计划
│   ├── 03_draft.md               # ③ 正文初稿
│   ├── 04_typo.md                # ④ 错别字校勘
│   ├── 05_deai.md                # ⑤ 去 AI 味洗练
│   ├── 06_polish.md              # ⑥ 点金润色
│   └── 07_title.md               # ⑦ 题签 8 候选书名
├── src/                          # 移动端界面（React + Tailwind + Zustand）
│   ├── components/
│   │   ├── EditorPane.tsx        # 写作工作流视窗与阅读定稿台
│   │   ├── BookshelfPane.tsx     # 书架典藏与多卷管理
│   │   ├── SettingsPage.tsx      # 天工设置（模型预设/阶段绑定/词库）
│   │   ├── WizardBottomSheet.tsx # 6 步开卷问策底部抽屉
│   │   └── TitleSheet.tsx        # 题签候选书名小窗口
│   ├── stores/                   # 状态管理
│   ├── services/                 # 本地持久化与 VFS
│   ├── lib/                      # LLM SSE 流式网络适配层
│   ├── index.css                 # 顶级古墨羊皮卷主题样式库
│   └── App.tsx                   # 移动端三栏主骨架
├── android/                      # Capacitor 原生 Android 工程
└── .github/workflows/build.yml   # CI 自动构建打包 Web + Android APK
```

---

## 五、在仓库内构建与打包

### 1. 本地环境要求
- Node.js >= 20.0
- npm >= 10.0

### 2. 本地开发与 Web 产物构建
```bash
# 1. 安装依赖
npm install

# 2. 本地启动开发服务器
npm run dev

# 3. 生产打包（TypeScript 类型检查 + Vite 构建）
npm run build
# 产物输出至 dist/
```

### 3. Android 原生工程同步与 APK 打包
```bash
# 1. 确保生产包已编译，并同步到 Android 原生工程
npm run build
npx cap sync android

# 2. 使用 Gradle 构建 Android Debug APK（需本地 JDK 21）
cd android
./gradlew assembleDebug --no-daemon
# 生成 APK 产物路径：android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. GitHub Actions 云端全自动打包（推荐）
仓库已经配置完善的 CI 自动化构建流水线（`.github/workflows/build.yml`）：
- 只要将代码推送至 `main` 分支，GitHub Actions 将全自动并行执行：
  - **`web-preview`**：编译 Web 静态产物并自动发布部署。
  - **`android-apk`**：在 Ubuntu 虚拟环境中安装 JDK 21 与 Gradle，自动构建出 **NovelFlow-Android-APK** 安装包，并在 Artifacts 中提供即刻下载！
  - **`release-apk`**：推送 `v*` 标签时，自动创建 GitHub Release 并挂载 APK 下载。

---

## 六、开源协议与说明

- 本工程采用宽松 **MIT License** 开源。
- 绝无闭源黑盒依赖，所有密钥均本地加密存储，纯端到端调用，保障创作者隐私安全。
