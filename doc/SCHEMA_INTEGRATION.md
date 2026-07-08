# JSON Schema 驱动 JSON 数据生成 - 集成指南

## 概述

本框架基于 `react-jsonschema-form` (RJSF) 实现，允许用户导入 JSON Schema 文档，通过可视化表单生成符合规范的 JSON 数据。

## 已创建的文件

### 核心文件

1. **`src/hooks/useSchemaProcessor.ts`**
   - Schema 加载和解析
   - 表单数据管理
   - Schema 验证
   - 默认值生成

2. **`src/components/SchemaForm/SchemaForm.tsx`**
   - RJSF 表单组件封装
   - 实时验证
   - 数据变更回调

3. **`src/components/SchemaPanel/SchemaPanel.tsx`**
   - Schema 结构展示
   - 字段信息预览
   - 必填字段标识

4. **`src/utils/schemaTransform.ts`**
   - 表单数据 ↔ 树形结构转换
   - 与现有 TreeEditor 集成

### 样式文件

- `src/components/SchemaForm/SchemaForm.module.css`
- `src/components/SchemaPanel/SchemaPanel.module.css`

### 示例文件

- `examples/user-schema.json` - 用户信息 Schema 示例

## 安装依赖

由于 PowerShell 执行策略限制，请手动执行以下命令：

```bash
cd d:\workspace\workspace\json-viewer
npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8 ajv
```

## 集成步骤

### 1. 在 App.tsx 中集成

```typescript
import { useSchemaProcessor } from './hooks/useSchemaProcessor';
import { SchemaForm } from './components/SchemaForm/SchemaForm';
import { SchemaPanel } from './components/SchemaPanel/SchemaPanel';
import { formToJsonTree, jsonTreeToForm } from './utils/schemaTransform';

function App() {
  const { jsonText, treeData, updateFromTree, updateFromCode } = useJsonSync();
  const { schema, formData, loadSchema, updateFormData } = useSchemaProcessor();
  
  const [viewMode, setViewMode] = useState<'tree' | 'form'>('tree');
  const [schemaPanelVisible, setSchemaPanelVisible] = useState(false);

  // 表单数据变化时同步到树形编辑器
  useEffect(() => {
    if (schema && formData) {
      const treeData = formToJsonTree(formData, schema);
      updateFromTree(treeData);
    }
  }, [formData, schema, updateFromTree]);

  // 导入 Schema
  const handleImportSchema = async () => {
    const content = await readSchemaFile(); // 实现文件读取
    await loadSchema(content);
    setViewMode('form');
    setSchemaPanelVisible(true);
  };

  return (
    <div className={styles.app}>
      <Toolbar
        onImportSchema={handleImportSchema}
        onViewModeChange={setViewMode}
      />
      
      <div className={styles.main}>
        {schemaPanelVisible && schema && (
          <SchemaPanel
            schema={schema}
            onClose={() => setSchemaPanelVisible(false)}
          />
        )}
        
        <SplitPane>
          {viewMode === 'tree' ? (
            <TreeEditor data={treeData} onChange={updateFromTree} />
          ) : (
            schema && (
              <SchemaForm
                schema={schema}
                formData={formData}
                onChange={updateFormData}
              />
            )
          )}
          
          <CodeEditor value={jsonText} onChange={updateFromCode} />
        </SplitPane>
      </div>
    </div>
  );
}
```

### 2. 添加导入按钮

在 Toolbar 组件中添加"导入 Schema"按钮：

```typescript
import { FileJson } from 'lucide-react';

<button onClick={onImportSchema} title="导入 Schema">
  <FileJson size={16} />
  导入 Schema
</button>
```

### 3. 添加视图切换

```typescript
<div className={styles.viewToggle}>
  <button 
    onClick={() => onViewModeChange('tree')}
    className={viewMode === 'tree' ? styles.active : ''}
  >
    树形视图
  </button>
  <button 
    onClick={() => onViewModeChange('form')}
    className={viewMode === 'form' ? styles.active : ''}
  >
    表单视图
  </button>
</div>
```

## 使用流程

1. **导入 Schema**
   - 点击"导入 Schema"按钮
   - 选择 JSON Schema 文件
   - 系统自动解析并验证 Schema

2. **填写表单**
   - 切换到表单视图
   - 根据 Schema 自动生成的表单填写数据
   - 实时验证输入数据

3. **生成 JSON**
   - 表单数据自动同步到代码编辑器
   - 可切换到树形视图查看结构
   - 保存生成的 JSON 文件

## 支持的 Schema 特性

- ✅ 基础类型：string, number, integer, boolean, null
- ✅ 对象类型：object with properties
- ✅ 数组类型：array with items
- ✅ 枚举值：enum
- ✅ 默认值：default
- ✅ 格式验证：format (email, uri, date, etc.)
- ✅ 正则验证：pattern
- ✅ 数值范围：minimum, maximum
- ✅ 字符串长度：minLength, maxLength
- ✅ 必填字段：required
- ✅ 嵌套结构：支持多层嵌套

## 自定义样式

表单样式使用 CSS Modules，可通过修改以下文件自定义：

- `SchemaForm.module.css` - 表单控件样式
- `SchemaPanel.module.css` - Schema 面板样式

主要 CSS 变量：

```css
--bg-primary: 主背景色
--bg-secondary: 次背景色
--text-primary: 主文本颜色
--text-secondary: 次文本颜色
--border-color: 边框颜色
--primary-color: 主题色
--error-color: 错误色
```

## 示例 Schema

查看 `examples/user-schema.json` 了解完整的 Schema 示例，包含：

- 字符串字段（带长度限制、正则验证）
- 数值字段（带范围限制）
- 枚举字段
- 嵌套对象
- 数组字段
- 布尔字段
- 必填字段

## 下一步

1. 安装依赖包
2. 在 App.tsx 中集成组件
3. 实现文件读取功能
4. 测试示例 Schema
5. 根据需求自定义样式和功能

## 技术栈

- **react-jsonschema-form** - 表单生成引擎
- **@rjsf/validator-ajv8** - JSON Schema 验证
- **ajv** - 高性能 JSON Schema 验证器
- **react-arborist** - 树形编辑器（复用现有）
- **Monaco Editor** - 代码编辑器（复用现有）
