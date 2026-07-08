# JSON Viewer UI 布局设计方案

## 1. 整体架构

### 1.1 布局结构

```
┌─────────────────────────────────────────────────────────────┐
│                         Toolbar                              │
│  [新建] [打开] [导入Schema] [保存] [刷新] [主题] ...        │
├──────────────────┬──────────────────────────────────────────┤
│                  │  [代码编辑器] [JSON表单] [JSON Schema]    │
│                  ├──────────────────────────────────────────┤
│   TreeEditor     │                                          │
│   (树状编辑器)    │                                          │
│                  │        Tab Content Area                  │
│   - 节点树形展示  │                                          │
│   - 拖拽排序     │   - 代码编辑器: Monaco Editor            │
│   - 右键菜单     │   - JSON表单: RJSF 动态表单              │
│   - 属性编辑     │   - JSON Schema: Schema 结构展示         │
│                  │                                          │
│                  │                                          │
├──────────────────┴──────────────────────────────────────────┤
│                      StatusBar                               │
│  行: 1, 列: 1 | 节点数: 10 | 验证状态: ✓                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件关系

```plantuml
@startuml
skinparam componentStyle rectangle

package "App" {
  [Toolbar] as toolbar
  [SplitPane] as split
  
  package "左侧面板" {
    [TreeEditor] as tree
  }
  
  package "右侧面板" {
    [TabBar] as tabs
    
    package "Tab Content" {
      [CodeEditor] as code
      [SchemaForm] as form
      [SchemaPanel] as schema
    }
  }
  
  [StatusBar] as status
}

toolbar --> split
split --> tree
split --> tabs
tabs --> code
tabs --> form
tabs --> schema
split --> status

note right of tree
  始终显示
  树状编辑器
end note

note right of tabs
  三个 Tab 切换
  - 代码编辑器
  - JSON 表单
  - JSON Schema
end note

@enduml
```

## 2. 状态管理

### 2.1 状态流转图

```plantuml
@startuml
skinparam state {
  BackgroundColor<<Active>> #LightBlue
}

[*] --> 无Schema状态

无Schema状态 --> 导入Schema : 点击"导入Schema"
导入Schema --> 验证Schema : 解析JSON
验证Schema --> Schema有效 : 验证通过
验证Schema --> Schema无效 : 验证失败
Schema无效 --> 无Schema状态 : 显示错误提示

Schema有效 --> 代码编辑器Tab : 默认显示
代码编辑器Tab --> JSON表单Tab : 点击Tab
JSON表单Tab --> JSONSchemaTab : 点击Tab
JSONSchemaTab --> 代码编辑器Tab : 点击Tab

代码编辑器Tab --> 无Schema状态 : 清除Schema
JSON表单Tab --> 无Schema状态 : 清除Schema
JSONSchemaTab --> 无Schema状态 : 清除Schema

state 代码编辑器Tab {
  [*] --> Monaco编辑器
  Monaco编辑器 --> 实时验证
  实时验证 --> 同步到Tree
}

state JSON表单Tab {
  [*] --> RJSF表单
  RJSF表单 --> 字段验证
  字段验证 --> 生成JSON
  生成JSON --> 同步到Tree
}

state JSONSchemaTab {
  [*] --> Schema结构树
  Schema结构树 --> 字段信息展示
}

@enduml
```

### 2.2 数据同步流程

```plantuml
@startuml
participant "TreeEditor" as tree
participant "CodeEditor" as code
participant "SchemaForm" as form
participant "App State" as state

== 树形编辑器修改 ==
tree -> state : updateFromTree(data)
state -> code : 更新 jsonText
state -> form : 更新 formData

== 代码编辑器修改 ==
code -> state : updateFromCode(text)
state -> tree : 更新 treeData
state -> form : 更新 formData

== JSON表单修改 ==
form -> state : updateFormData(data)
state -> tree : 更新 treeData
state -> code : 更新 jsonText

@enduml
```

## 3. Tab 切换设计

### 3.1 Tab 状态机

```plantuml
@startuml
skinparam state {
  BackgroundColor<<Active>> #LightGreen
}

[*] --> CodeTab : 初始状态 / 无Schema

state "代码编辑器 Tab" as CodeTab <<Active>>
state "JSON 表单 Tab" as FormTab
state "JSON Schema Tab" as SchemaTab

CodeTab --> FormTab : 点击"JSON表单"
CodeTab --> SchemaTab : 点击"JSON Schema"

FormTab --> CodeTab : 点击"代码编辑器"
FormTab --> SchemaTab : 点击"JSON Schema"

SchemaTab --> CodeTab : 点击"代码编辑器"
SchemaTab --> FormTab : 点击"JSON表单"

CodeTab --> [*] : 清除 Schema
FormTab --> [*] : 清除 Schema
SchemaTab --> [*] : 清除 Schema

@enduml
```

### 3.2 Tab 样式设计

```typescript
interface TabConfig {
  id: 'code' | 'form' | 'schema';
  label: string;
  icon?: string;
  component: React.ComponentType;
}

const tabs: TabConfig[] = [
  {
    id: 'code',
    label: '代码编辑器',
    component: CodeEditor
  },
  {
    id: 'form',
    label: 'JSON 表单',
    component: SchemaForm
  },
  {
    id: 'schema',
    label: 'JSON Schema',
    component: SchemaPanel
  }
];
```

## 4. 组件职责

### 4.1 组件类图

```plantuml
@startuml
skinparam classAttributeIconSize 0

class App {
  - jsonText: string
  - treeData: TreeNode[]
  - schema: JsonSchema | null
  - formData: any
  - activeTab: 'code' | 'form' | 'schema'
  - theme: 'dark' | 'light'
  + handleImportSchema(): void
  + handleTabChange(tab: string): void
  + syncData(): void
}

class TreeEditor {
  - data: TreeNode[]
  - activeNodeId: string
  + onChange(data: TreeNode[]): void
  + onSelectNode(id: string): void
}

class CodeEditor {
  - value: string
  - theme: string
  + onChange(value: string): void
  + jumpToLine(line: number): void
}

class SchemaForm {
  - schema: JsonSchema
  - formData: any
  + onChange(data: any): void
  + validate(): boolean
}

class SchemaPanel {
  - schema: JsonSchema
  + onFieldSelect(path: string): void
}

App --> TreeEditor
App --> CodeEditor
App --> SchemaForm
App --> SchemaPanel

note right of TreeEditor
  左侧面板
  始终显示
end note

note right of CodeEditor
  右侧 Tab 1
  Monaco 编辑器
end note

note right of SchemaForm
  右侧 Tab 2
  RJSF 动态表单
end note

note right of SchemaPanel
  右侧 Tab 3
  Schema 结构展示
end note

@enduml
```

### 4.2 组件交互序列图

```plantuml
@startuml
actor User
participant "Toolbar" as toolbar
participant "App" as app
participant "TreeEditor" as tree
participant "TabBar" as tabs
participant "CodeEditor" as code
participant "SchemaForm" as form
participant "SchemaPanel" as schema

== 导入 Schema ==
User -> toolbar: 点击"导入Schema"
toolbar -> app: handleImportSchema()
app -> app: 加载并验证 Schema
app -> tabs: 显示 Tab 栏
app -> form: 初始化表单数据
app -> schema: 加载 Schema 结构

== 切换 Tab ==
User -> tabs: 点击"JSON表单"
tabs -> app: setActiveTab('form')
app -> form: 显示表单
app -> code: 隐藏代码编辑器
app -> schema: 隐藏 Schema 面板

User -> tabs: 点击"代码编辑器"
tabs -> app: setActiveTab('code')
app -> code: 显示代码编辑器
app -> form: 隐藏表单

== 数据同步 ==
User -> form: 修改表单字段
form -> app: onChange(formData)
app -> tree: 更新树形数据
app -> code: 更新 JSON 文本

User -> tree: 拖拽节点
tree -> app: onChange(treeData)
app -> code: 更新 JSON 文本
app -> form: 更新表单数据

@enduml
```

## 5. 响应式布局

### 5.1 布局适配策略

```plantuml
@startuml
skinparam componentStyle rectangle

package "桌面端 (> 1024px)" {
  [TreeEditor | TabContent] as desktop
}

package "平板端 (768px - 1024px)" {
  [TreeEditor] as tablet_tree
  [TabContent] as tablet_tabs
  tablet_tree -[hidden]-> tablet_tabs
}

package "移动端 (< 768px)" {
  [TabContent] as mobile_tabs
  [TreeEditor (抽屉)] as mobile_tree
  mobile_tree ..> mobile_tabs : 滑出
}

@enduml
```

### 5.2 面板宽度配置

```typescript
interface LayoutConfig {
  treeWidth: number;        // 左侧面板宽度
  minTreeWidth: number;     // 最小宽度
  maxTreeWidth: number;     // 最大宽度
  resizable: boolean;       // 是否可拖拽调整
}

const defaultLayout: LayoutConfig = {
  treeWidth: 400,
  minTreeWidth: 200,
  maxTreeWidth: 800,
  resizable: true
};
```

## 6. 性能优化

### 6.1 渲染优化策略

```plantuml
@startuml
skinparam componentStyle rectangle

[App] --> [React.memo] : 包裹组件
[React.memo] --> [TreeEditor]
[React.memo] --> [CodeEditor]
[React.memo] --> [SchemaForm]
[React.memo] --> [SchemaPanel]

[App] --> [useCallback] : 事件处理
[App] --> [useMemo] : 计算属性

note right of React.memo
  避免不必要的重渲染
  仅在 props 变化时更新
end note

note right of useCallback
  缓存事件处理函数
  避免子组件重复渲染
end note

note right of useMemo
  缓存计算结果
  避免重复计算
end note

@enduml
```

### 6.2 数据同步优化

```plantuml
@startuml
participant "Component" as comp
participant "useEffect" as effect
participant "Debounce" as debounce
participant "State Update" as update

comp -> effect: 数据变化
effect -> debounce: 触发防抖
debounce -> debounce: 等待 300ms
debounce -> update: 执行更新
update -> comp: 重新渲染

note over debounce
  避免频繁更新
  提升性能
end note

@enduml
```

## 7. 用户交互流程

### 7.1 完整使用流程

```plantuml
@startuml
start

:启动应用;

:显示 TreeEditor + CodeEditor;

if (需要导入 Schema?) then (是)
  :点击"导入Schema";
  :选择 Schema 文件;
  
  if (Schema 有效?) then (是)
    :显示 Tab 栏;
    :默认显示"代码编辑器"Tab;
    
    while (用户操作?) do (继续)
      if (切换到 JSON 表单?) then (是)
        :点击"JSON表单"Tab;
        :显示动态表单;
        :填写表单数据;
        :实时同步到 Tree 和 Code;
      elseif (切换到 JSON Schema?) then (是)
        :点击"JSON Schema"Tab;
        :查看 Schema 结构;
        :了解字段定义;
      else (使用代码编辑器)
        :在 CodeEditor 中编辑;
        :实时同步到 Tree;
      endif
    endwhile (结束)
    
  else (否)
    :显示错误提示;
    :保持原有界面;
  endif
  
else (否)
  :直接使用 TreeEditor + CodeEditor;
  :编辑 JSON 数据;
endif

:保存文件;

stop

@enduml
```

### 7.2 快捷键设计

```typescript
interface KeyboardShortcuts {
  // Tab 切换
  'Ctrl+1': '切换到代码编辑器';
  'Ctrl+2': '切换到JSON表单';
  'Ctrl+3': '切换到JSON Schema';
  
  // 通用操作
  'Ctrl+S': '保存文件';
  'Ctrl+O': '打开文件';
  'Ctrl+N': '新建文件';
  'Ctrl+Shift+S': '导入Schema';
  
  // 编辑操作
  'Ctrl+Z': '撤销';
  'Ctrl+Y': '重做';
  'Ctrl+F': '查找';
  'Ctrl+H': '替换';
}
```

## 8. 主题适配

### 8.1 主题变量

```typescript
interface ThemeVariables {
  // 基础颜色
  '--bg-primary': string;
  '--bg-secondary': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--border': string;
  '--accent': string;
  
  // Tab 样式
  '--tab-bg': string;
  '--tab-bg-active': string;
  '--tab-text': string;
  '--tab-text-active': string;
  '--tab-border': string;
}

const lightTheme: ThemeVariables = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f5f5f5',
  '--text-primary': '#333333',
  '--text-secondary': '#666666',
  '--border': '#e8e8e8',
  '--accent': '#1890ff',
  
  '--tab-bg': 'transparent',
  '--tab-bg-active': '#ffffff',
  '--tab-text': '#666666',
  '--tab-text-active': '#333333',
  '--tab-border': '#1890ff'
};

const darkTheme: ThemeVariables = {
  '--bg-primary': '#1e1e1e',
  '--bg-secondary': '#252525',
  '--text-primary': '#d4d4d4',
  '--text-secondary': '#858585',
  '--border': '#3e3e3e',
  '--accent': '#007acc',
  
  '--tab-bg': 'transparent',
  '--tab-bg-active': '#1e1e1e',
  '--tab-text': '#858585',
  '--tab-text-active': '#d4d4d4',
  '--tab-border': '#007acc'
};
```

## 9. 扩展性设计

### 9.1 插件化 Tab

```plantuml
@startuml
skinparam componentStyle rectangle

interface TabPlugin {
  + id: string
  + label: string
  + icon?: string
  + component: React.ComponentType
  + shouldShow(): boolean
}

class CodeTabPlugin {
  + id: 'code'
  + label: '代码编辑器'
  + component: CodeEditor
  + shouldShow(): true
}

class FormTabPlugin {
  + id: 'form'
  + label: 'JSON 表单'
  + component: SchemaForm
  + shouldShow(): boolean
}

class SchemaTabPlugin {
  + id: 'schema'
  + label: 'JSON Schema'
  + component: SchemaPanel
  + shouldShow(): boolean
}

class CustomTabPlugin {
  + id: string
  + label: string
  + component: React.ComponentType
  + shouldShow(): boolean
}

TabPlugin <|-- CodeTabPlugin
TabPlugin <|-- FormTabPlugin
TabPlugin <|-- SchemaTabPlugin
TabPlugin <|-- CustomTabPlugin

[TabManager] --> TabPlugin : 管理插件

note right of TabManager
  支持动态注册 Tab
  支持条件显示
  支持自定义 Tab
end note

@enduml
```

### 9.2 未来扩展方向

1. **数据对比 Tab**：对比两个 JSON 文件的差异
2. **数据验证 Tab**：可视化展示验证结果
3. **数据转换 Tab**：JSON 与其他格式互转（XML、YAML、CSV）
4. **数据可视化 Tab**：图表展示 JSON 数据
5. **历史记录 Tab**：查看和恢复历史版本

## 10. 总结

### 10.1 设计优势

1. **清晰的布局**：左侧树形编辑器 + 右侧 Tab 切换，职责分明
2. **灵活的切换**：三个 Tab 满足不同场景需求
3. **实时的同步**：三个视图数据实时同步，保持一致性
4. **良好的扩展**：插件化设计，易于添加新功能
5. **优秀的性能**：React.memo、useCallback、useMemo 优化渲染

### 10.2 核心特性

- ✅ 树状编辑器始终显示，提供直观的节点操作
- ✅ 代码编辑器提供精确的文本编辑
- ✅ JSON 表单提供友好的表单填写体验
- ✅ JSON Schema 提供清晰的结构展示
- ✅ 三个视图数据实时同步
- ✅ 支持主题切换
- ✅ 响应式布局
- ✅ 插件化扩展

### 10.3 技术栈

- **UI 框架**：React 18 + TypeScript
- **代码编辑器**：Monaco Editor
- **表单生成**：React JSON Schema Form (RJSF)
- **树形组件**：react-arborist
- **状态管理**：React Hooks
- **样式方案**：CSS Modules + CSS Variables
