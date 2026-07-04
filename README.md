# JSON Viewer

基于 React + Electron 的桌面 JSON 文档编辑器，支持可视化树状编辑和代码编辑。

## 功能特性

- **双栏编辑** — 左侧树状视图、右侧 Monaco 代码编辑器，同步编辑
- **可视化树编辑** — 展开/折叠节点、添加/删除/重命名节点、拖拽排序
- **代码编辑** — 基于 Monaco Editor，语法高亮、自动补全
- **多文件支持** — 打开多个 JSON 文件，通过标签页切换
- **文件浏览器** — 左侧文件列表，支持拖拽导入，仅显示 `.json` 文件
- **状态栏** — 显示当前文件名、节点数、光标行列位置
- **深色主题** — 统一的深色界面风格

## 使用方式

### 开发

```bash
# 启动 Vite 开发服务器 + Electron 窗口（热更新）
npm run dev
```

`npm run dev` 启动 Vite 开发服务器，自动弹出 Electron 窗口，支持 HMR 热更新。

### 构建并运行

```bash
# 编译前端代码后启动 Electron 窗口
npm run win
```

### 预览构建产物

```bash
npm run server
```

## 技术栈

| 技术 | 用途 |
|------|------|
| **React 18** | UI 框架 |
| **TypeScript** | 类型安全 |
| **Vite** | 构建工具 |
| **Electron 28** | 桌面应用壳 |
| **Monaco Editor** | 代码编辑器 |
| **react-arborist** | 树状视图组件 |
| **Lucide React** | 图标库 |

## 项目结构

```
src/
├── App.tsx                         # 主应用，状态管理
├── main.tsx                        # React 入口
├── vite-env.d.ts                   # 类型声明
├── global.d.ts                     # Electron API 类型
├── hooks/
│   └── useJsonSync.ts              # JSON 编辑器同步逻辑
├── components/
│   ├── Toolbar/                    # 顶部工具栏（打开/保存文件）
│   ├── FileExplorer/               # 文件列表
│   ├── TreeEditor/                 # 树状编辑器
│   │   ├── TreeEditor.tsx          # 主组件
│   │   ├── TreeNode.tsx            # 树节点渲染
│   │   └── AddNodeDialog.tsx       # 添加节点弹窗
│   ├── CodeEditor/                 # 代码编辑器
│   ├── SplitPane/                  # 可拖拽分割面板
│   └── StatusBar/                  # 底部状态栏
electron/
├── main.ts                         # Electron 主进程
└── preload.ts                      # 预加载脚本
```

## Electron API

应用通过 `contextBridge` 暴露 `window.electronAPI`，提供以下功能：

- **文件操作**: `openFile`, `openFiles`, `readFile`, `writeFile`, `saveFile`
- **目录操作**: `openDirectory`, `readDirectory`
- **批量操作**: `statBatch`（拖拽导入使用）
- **系统交互**: `showMessageBox`
