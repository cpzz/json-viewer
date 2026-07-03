# JSON 可视化编辑器实现方案

## 背景

创建一个桌面端 JSON 可视化编辑器，提供树状编辑和源码编辑两种视图，支持实时同步、大文件虚拟滚动、拖拽排序等功能。

## 技术栈

- **运行时**: Electron 28+
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **代码编辑器**: Monaco Editor (@monaco-editor/react)
- **树状编辑器**: react-arborist (支持虚拟滚动、拖拽、内联编辑)
- **图标库**: Lucide React
- **样式方案**: CSS Modules

## 项目结构

```
json-viewer/
├── electron/
│   ├── main.ts              # Electron 主进程
│   └── preload.ts           # 预加载脚本
├── src/
│   ├── main.tsx             # React 入口
│   ├── App.tsx              # 主应用组件
│   ├── components/
│   │   ├── Toolbar/
│   │   │   ├── Toolbar.tsx          # 工具栏
│   │   │   └── Toolbar.module.css
│   │   ├── SplitPane/
│   │   │   ├── SplitPane.tsx        # 可调整大小的分割面板
│   │   │   └── SplitPane.module.css
│   │   ├── TreeEditor/
│   │   │   ├── TreeEditor.tsx       # 树状编辑器
│   │   │   ├── TreeNode.tsx         # 树节点组件
│   │   │   └── TreeEditor.module.css
│   │   └── CodeEditor/
│   │       ├── CodeEditor.tsx       # Monaco 编辑器包装
│   │       └── CodeEditor.module.css
│   ├── hooks/
│   │   ├── useJsonSync.ts           # JSON 同步逻辑
│   │   └── useFileOperations.ts     # 文件操作
│   ├── utils/
│   │   ├── jsonUtils.ts             # JSON 解析/序列化工具
│   │   └── treeUtils.ts             # 树结构操作工具
│   └── types/
│       └── index.ts                 # 类型定义
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json
```

## 核心功能实现

### 1. 项目初始化

**步骤**:
1. 初始化 package.json，配置 Electron + React + TypeScript
2. 配置 Vite 用于 React 构建
3. 配置 Electron 主进程和预加载脚本
4. 安装依赖:
   - electron, electron-builder
   - react, react-dom, @types/react, @types/react-dom
   - @monaco-editor/react
   - react-arborist
   - lucide-react
   - typescript, vite, @vitejs/plugin-react

### 2. Electron 主进程 (electron/main.ts)

**职责**:
- 创建 BrowserWindow
- 处理文件对话框 (打开/保存)
- IPC 通信与渲染进程交互
- 处理文件拖拽

**关键 API**:
- `dialog.showOpenDialog()` - 打开文件对话框
- `dialog.showSaveDialog()` - 保存文件对话框
- `fs.readFile()` / `fs.writeFile()` - 文件读写
- `ipcMain.handle()` - 处理渲染进程请求

### 3. 预加载脚本 (electron/preload.ts)

**暴露 API**:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content: string) => ipcRenderer.invoke('dialog:saveFile', content),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  onFileDrop: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file:drop', (_, filePath) => callback(filePath))
  }
})
```

### 4. 分割面板布局 (SplitPane)

**功能**:
- 左右可拖拽分割线
- 支持显示/隐藏左右面板
- 最小宽度限制 (200px)
- 拖拽时显示预览线

**实现**:
- 使用 mousedown/mousemove/mouseup 事件处理拖拽
- 状态: leftWidth, isDragging, leftVisible, rightVisible
- CSS: flexbox + position: absolute 实现可调整布局

### 5. 工具栏 (Toolbar)

**按钮** (使用 Lucide React 图标):
- FolderOpen - 打开文件
- Save - 保存文件
- RefreshCw - 刷新
- PanelLeftClose/PanelLeftOpen - 切换左侧面板
- PanelRightClose/PanelRightOpen - 切换右侧面板

**实现**:
- 图标按钮组件，带 tooltip
- 点击事件调用 electronAPI

### 6. Monaco 编辑器 (CodeEditor)

**功能**:
- JSON 语法高亮
- 自动补全
- 查找/替换 (Ctrl+F, Ctrl+H)
- 格式化 (Shift+Alt+F)
- 错误提示

**实现**:
- 使用 @monaco-editor/react
- 配置 language: 'json'
- 监听 onChange 事件，同步到树状编辑器
- 提供 setValue 方法供外部调用

### 7. 树状编辑器 (TreeEditor)

**核心功能**:
- 虚拟滚动 (react-arborist 内置)
- 拖拽排序
- 内联编辑 key/value
- 节点类型切换 (string/number/boolean/null/object/array)
- 添加/删除节点
- 展开/折叠

**数据结构**:
```typescript
interface TreeNode {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';
  children?: TreeNode[];
  isExpanded?: boolean;
}
```

**实现**:
- 使用 react-arborist 的 Tree 组件
- 自定义 NodeRenderer 渲染节点
- 双击进入编辑模式
- 右键菜单: 添加子节点、删除节点、修改类型
- 拖拽时调用 onMove 回调更新数据

### 8. JSON 同步逻辑 (useJsonSync)

**核心挑战**:
- 树状编辑 → 更新源码 (序列化 JSON)
- 源码编辑 → 更新树状 (解析 JSON)
- 避免循环更新
- 处理 JSON 解析错误

**实现策略**:
```typescript
const useJsonSync = () => {
  const [jsonText, setJsonText] = useState('');
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const isUpdatingRef = useRef(false); // 防止循环更新

  // 树状 → 源码
  const updateFromTree = (newTree: TreeNode[]) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    const text = JSON.stringify(treeToJson(newTree), null, 2);
    setJsonText(text);
    setParseError(null);
    setTimeout(() => isUpdatingRef.current = false, 0);
  };

  // 源码 → 树状
  const updateFromCode = (newText: string) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    try {
      const parsed = JSON.parse(newText);
      setTreeData(jsonToTree(parsed));
      setParseError(null);
    } catch (e) {
      setParseError(e.message);
    }
    setTimeout(() => isUpdatingRef.current = false, 0);
  };

  return { jsonText, treeData, parseError, updateFromTree, updateFromCode };
};
```

**关键函数**:
- `jsonToTree(json: any): TreeNode[]` - 将 JSON 转换为树结构
- `treeToJson(tree: TreeNode[]): any` - 将树结构转换回 JSON

### 9. 文件操作 (useFileOperations)

**功能**:
- 打开文件对话框
- 保存文件对话框
- 读取文件内容
- 写入文件内容
- 处理拖拽文件

**实现**:
```typescript
const useFileOperations = () => {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  const openFile = async (): Promise<string> => {
    const result = await window.electronAPI.openFile();
    if (result.filePath) {
      const content = await window.electronAPI.readFile(result.filePath);
      setCurrentFilePath(result.filePath);
      return content;
    }
    return '';
  };

  const saveFile = async (content: string): Promise<boolean> => {
    let filePath = currentFilePath;
    if (!filePath) {
      const result = await window.electronAPI.saveFile(content);
      filePath = result.filePath;
    }
    if (filePath) {
      await window.electronAPI.writeFile(filePath, content);
      setCurrentFilePath(filePath);
      return true;
    }
    return false;
  };

  return { openFile, saveFile, currentFilePath };
};
```

### 10. 主应用组件 (App.tsx)

**结构**:
```typescript
const App = () => {
  const { jsonText, treeData, parseError, updateFromTree, updateFromCode } = useJsonSync();
  const { openFile, saveFile } = useFileOperations();
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);

  const handleOpen = async () => {
    const content = await openFile();
    if (content) updateFromCode(content);
  };

  const handleSave = async () => {
    await saveFile(jsonText);
  };

  return (
    <div className="app">
      <Toolbar
        onOpen={handleOpen}
        onSave={handleSave}
        onRefresh={() => updateFromCode(jsonText)}
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        onToggleLeft={() => setLeftVisible(!leftVisible)}
        onToggleRight={() => setRightVisible(!rightVisible)}
      />
      <SplitPane
        leftVisible={leftVisible}
        rightVisible={rightVisible}
      >
        <TreeEditor
          data={treeData}
          onChange={updateFromTree}
        />
        <CodeEditor
          value={jsonText}
          onChange={updateFromCode}
          error={parseError}
        />
      </SplitPane>
    </div>
  );
};
```

## 实现步骤

### 第一步: 项目初始化 (预计 30 分钟)
1. 创建 package.json，配置依赖
2. 配置 tsconfig.json
3. 配置 vite.config.ts
4. 创建 electron/main.ts 和 electron/preload.ts
5. 创建基础 HTML 入口

### 第二步: 基础布局 (预计 1 小时)
1. 实现 SplitPane 组件
2. 实现 Toolbar 组件
3. 创建 App.tsx 主框架
4. 添加基础样式

### 第三步: Monaco 编辑器集成 (预计 1 小时)
1. 实现 CodeEditor 组件
2. 配置 JSON 语言支持
3. 添加 onChange 回调
4. 测试编辑器功能

### 第四步: 树状编辑器 (预计 2 小时)
1. 实现 TreeEditor 组件
2. 配置 react-arborist
3. 实现自定义节点渲染
4. 添加内联编辑功能
5. 实现拖拽排序
6. 添加右键菜单

### 第五步: JSON 同步逻辑 (预计 1.5 小时)
1. 实现 useJsonSync hook
2. 实现 jsonToTree 和 treeToJson 转换
3. 处理循环更新问题
4. 添加错误处理

### 第六步: 文件操作 (预计 1 小时)
1. 实现 Electron IPC 通信
2. 实现 useFileOperations hook
3. 添加文件拖拽支持
4. 测试打开/保存功能

### 第七步: 优化和测试 (预计 1 小时)
1. 添加加载状态
2. 优化大文件性能
3. 测试各种边界情况
4. 修复 bug

**总预计时间**: 7-8 小时

## 验证方案

1. **启动应用**: `npm run dev` 启动开发服务器，`npm run electron:dev` 启动 Electron
2. **测试布局**:
   - 拖拽分割线调整大小
   - 点击按钮显示/隐藏面板
3. **测试编辑器**:
   - 在 Monaco 中输入 JSON，检查树状视图是否同步更新
   - 在树状视图中编辑节点，检查 Monaco 是否同步更新
   - 测试拖拽排序节点
4. **测试文件操作**:
   - 点击打开按钮，选择 JSON 文件
   - 编辑后点击保存按钮
   - 拖拽 JSON 文件到窗口
5. **测试大文件**:
   - 加载 1MB+ 的 JSON 文件
   - 检查虚拟滚动是否流畅
   - 检查编辑响应速度

## 关键依赖版本

```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@monaco-editor/react": "^4.6.0",
  "react-arborist": "^3.4.0",
  "lucide-react": "^0.294.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.2.0"
}
```

## 注意事项

1. **性能优化**:
   - 使用 useRef 防止循环更新
   - 大文件使用虚拟滚动
   - 避免不必要的重新渲染 (React.memo, useMemo)

2. **错误处理**:
   - JSON 解析错误时显示提示
   - 文件操作错误时显示错误信息
   - 网络错误处理

3. **用户体验**:
   - 添加加载状态指示器
   - 快捷键支持 (Ctrl+S 保存, Ctrl+O 打开)
   - 未保存更改提示

4. **类型安全**:
   - 完整的 TypeScript 类型定义
   - 避免使用 any 类型
   - IPC 通信类型安全
