# Timestamp Flow

一个极简的跨平台桌面时钟：24 小时制大字号时间、当日日期、内置网页搜索，以及实时 Unix 时间戳（秒 / 毫秒）。基于 [Neutralinojs](https://neutralino.js.org/) 构建，Windows 包体仅约 2.5 MB。

当前版本：`1.1.0`

## 功能

- **时钟**：秒级跳动显示，支持 12 / 24 小时制切换（12 小时制显示 AM/PM）。
- **日期**：本地化的日期与星期（`2026年10月22日 · 星期四` / `Oct 22, 2026 · Thursday`）。
- **时区**：可在常用 IANA 时区之间切换，支持"跟随系统"，面板内可搜索过滤，每项实时显示对应时刻。
- **Unix 时间戳**：底部同时显示秒级与毫秒级时间戳，点击即复制到剪贴板。
- **网页搜索**：内置 Google / Bing / 百度切换，回车后交给系统默认浏览器打开。
- **主题**：默认跟随系统 `prefers-color-scheme`，也可手动切换明暗。
- **窗口**：无边框 + 透明圆角，标题栏可拖拽；支持置顶、全屏、最小化、关闭。
- **语言**：中文 / English 即时切换，无需重载。
- **记忆**：所有偏好写入 `localStorage`，重启后保留。

## 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `Ctrl / ⌘ + K` | 聚焦并全选搜索框 |
| `F11` | 切换全屏 |
| `P` | 切换窗口置顶（输入框聚焦时不生效） |
| `Enter` | 在搜索框中提交搜索 |
| `Esc` | 逐级退出：清空搜索框 → 失焦 → 关闭时区面板 → 退出全屏 → 关闭窗口 |

## 技术栈

| 层 | 实现 |
| --- | --- |
| 原生壳 | Neutralinojs 6.10（`bin/` 下的官方二进制，按平台分文件） |
| 渲染 | 系统 WebView（Windows 为 WebView2 / Edge Chromium） |
| 界面 | 原生 HTML + CSS + JavaScript，**无打包器、无框架、无构建步骤** |
| 原生能力 | `Neutralino.window` / `os` / `clipboard` / `app`，权限由 `nativeAllowList` 声明 |
| 图标生成 | `scripts/make-icon.js`，纯 Node 手写 PNG 编码，无第三方依赖 |
| 测试 | Node 内置 `node:test`，无需安装测试框架 |

前端脚本采用 UMD 风格（`resources/js/*.js`）：浏览器下挂到 `globalThis`，Node 下 `module.exports`，因此业务逻辑可被单元测试直接 `require`。

## 目录结构

```
timestamp_flow/
├── resources/                 # 前端界面，即 Neutralino 的 documentRoot
│   ├── icons/appIcon.png      # 应用图标（由 npm run icon 生成，512×512）
│   ├── js/
│   │   ├── i18n.js            # 中英文文案字典
│   │   ├── neutralino.js      # Neutralino 客户端库（由 npx neu update 提供）
│   │   ├── search.js          # 搜索引擎白名单与 URL 拼装
│   │   └── zones.js           # 常用时区数据与时间格式化
│   ├── index.html             # 界面结构
│   ├── renderer.js            # 时钟、交互、原生 API 桥接
│   └── styles.css             # 主题变量与布局
├── scripts/
│   ├── make-icon.js           # 生成 appIcon.png
│   └── package.js             # 一键出包：校验版本 → 构建 → 归档 → zip → SHA256
├── tests/
│   ├── i18n.test.js           # 中英文键一致性、日期格式、星期顺序
│   ├── search.test.js         # 引擎白名单与 URL 编码
│   └── zones.test.js          # 时区换算与名称回退
├── electron-legacy/           # 早期 Electron 实现，仅作归档，不参与构建
├── bin/                       # Neutralino 原生二进制（git 忽略）
├── dist/                      # 构建产物（git 忽略）
├── neutralino.config.json     # 应用元信息、窗口参数、原生权限
├── package.json
└── package-lock.json
```

## 快速开始

环境要求：

- Node.js 18 及以上
- Windows 10 及以上 / macOS 11+ / 主流 Linux 桌面（需有 WebView 运行时）
- 无需 Rust、Python 或 C++ 工具链

```bash
npm install        # 安装 neu 命令行工具
npx neu update     # 首次需要：下载 bin/ 下的原生二进制与客户端库
npm run dev        # 启动开发模式，实时读取 resources/
```

开发模式下直接加载磁盘上的 `resources/` 目录，改完 HTML/CSS/JS 刷新即可，不必重新构建。

## npm 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` / `npm start` | `neu run`，开发模式启动 |
| `npm run build` | `neu build`，生成 `dist/timestamp-flow/`（exe + `resources.neu`） |
| `npm run dist` | 一键出包：校验版本一致性 → 补图标 → 构建 → 归档到 `dist/release/` → 打 zip → 输出 SHA256 |
| `npm run icon` | 重新生成 `resources/icons/appIcon.png` |
| `npm test` | 运行全部单元测试 |

## 构建与发布

```bash
npm run dist
```

产物：

```
dist/release/
├── TimestampFlow-1.1.0-win-x64/
│   ├── timestamp-flow-win_x64.exe     # 约 2.40 MB
│   └── resources.neu                  # 约 0.10 MB
└── TimestampFlow-1.1.0-win-x64.zip    # 约 1.20 MB
```

`scripts/package.js` 会做这些事：

1. 校验 `package.json` 与 `neutralino.config.json` 的 `version` 必须一致，不一致直接失败。
2. 检查 `resources/js/neutralino.js` 是否存在，缺失时提示先执行 `npx neu update`。
3. 图标缺失则先跑 `make-icon.js`。
4. 执行 `neu build`，从 `dist/timestamp-flow/` 中挑选当前平台/架构的二进制与资源包。
5. 复制到 `dist/release/TimestampFlow-<version>-<platform>-<arch>/`，清掉同名旧目录。
6. 压缩为同名 zip（Windows 走 `Compress-Archive`，其他平台走 `zip`），并打印 zip 的 SHA256。

> **分发注意**：`timestamp-flow-win_x64.exe` 与 `resources.neu` 必须放在同一目录，缺一不可。exe 启动时按自身路径查找同级 `resources.neu`，从中加载 `neutralino.config.json` 与全部页面资源。

### 关于 `resources.neu`

`neu build` 把 `documentRoot`（本项目为 `/resources/`）连同 `neutralino.config.json` 打包成单一文件。它不是 zip，而是「短头部 + JSON manifest + 各文件原始字节顺序拼接」，manifest 中记录每个文件的 `size` / `offset` 与 SHA256 校验块。

因此：

- 改动 `resources/` 下任何文件（含 `neutralino.config.json` 里的版本号、窗口尺寸）后**必须重新构建**，包内是快照，不会自动同步。
- 替换 exe 与 `resources.neu` 需成对进行，版本混搭会导致行为异常。
- Neutralino 官方**不支持**把资源嵌入 exe 做成单文件；如需真正的单 exe 分发，可考虑 Tauri 等方案。

## 配置

`neutralino.config.json` 中值得关注的字段：

| 字段 | 当前值 / 含义 |
| --- | --- |
| `applicationId` | `dev.timestampflow.clock`，决定 WebView 数据目录位置 |
| `documentRoot` | `/resources/`，前端根目录 |
| `modes.window` | 460×334，最小 360×300，居中、透明、无边框、可缩放 |
| `nativeAllowList` | `app.*`、`window.*`、`os.open`、`clipboard.writeText`、`debug.log` |
| `tokenSecurity` | `one-time`，Native API 令牌一次性有效 |
| `enableInspector` | `false`，生产包不开放开发者工具 |

新增原生能力时，除改前端调用外，**必须同步把对应 API 加入 `nativeAllowList`**，否则调用会被拒绝。

## 数据存储

偏好保存在 WebView 的 `localStorage`，键名统一 `tf.` 前缀：

| 键 | 值 |
| --- | --- |
| `tf.hour12` | `'true'` / `'false'` |
| `tf.theme` | `'dark'` / `'light'` |
| `tf.pinned` | `'true'` / `'false'` |
| `tf.engine` | `'google'` / `'bing'` / `'baidu'` |
| `tf.lang` | `'zh'` / `'en'` |
| `tf.tz` | IANA 时区名或 `'local'`（跟随系统） |

这些数据实际存放在 WebView2 的用户数据目录中，Windows 上为 `%APPDATA%\timestamp-flow\EBWebView`。删除整个 `%APPDATA%\timestamp-flow` 目录即可恢复默认（同时会清掉缓存）。

## 定制

- **新增搜索引擎**：在 `resources/js/search.js` 的 `ENGINES` 中加入 `键: '前缀 URL'`，再到 `index.html` 的 `<select id="engine">` 添加同名 `<option>`。不在白名单中的引擎会回退到 Google，避免任意 URL 注入。
- **调整时区列表**：编辑 `resources/js/zones.js` 的 `COMMON_ZONES`，并补充 `ZONE_NAMES` 中的中文名称（`tests/zones.test.js` 会校验二者是否齐备）。
- **新增界面语言**：在 `resources/js/i18n.js` 的 `I18N` 中增加语言包（键必须与 `zh` 完全一致，`tests/i18n.test.js` 会校验），并在 `renderer.js` 的语言切换逻辑中开放该选项。
- **替换图标**：改完 `scripts/make-icon.js` 后执行 `npm run icon`，再重新构建。

## 测试

```bash
npm test
```

共 13 项断言，覆盖三块纯逻辑：中英文文案键一致性（含日期格式与星期顺序）、搜索引擎白名单与 URL 编码（含未知引擎回退、空关键词），以及常用时区换算与名称回退。UI 与原生调用不纳入自动化测试，依赖手动验证（`npm run dev`）。

## 已知限制

- **依赖系统 WebView**：Windows 需 WebView2 运行时（Win11 及绝大多数 Win10 已自带），极老的纯净系统需另行安装。
- **非单文件分发**：exe 与 `resources.neu` 必须成对提供，见上文说明。
- **需按平台分别构建**：`neu build` 只为当前平台产出，要跨平台发布需在对应系统上各跑一次。
- **Linux 透明/无边框**：表现取决于窗口管理器与合成器，可能与 Windows 上有差异；窗口置顶、全屏等行为同理。

## 历史

`electron-legacy/` 保留了最初的 Electron 实现（v1.0.0，NSIS 安装包）。为把包体从上百 MB 降到约 2.5 MB，v1.1.0 迁移到 Neutralinojs 并以纯静态前端重写，该目录不再参与构建，仅供对照参考。

## 许可证

MIT
