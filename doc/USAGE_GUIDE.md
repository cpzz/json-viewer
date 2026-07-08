# JSON Schema 驱动 JSON 数据生成 - 使用指南

## 快速开始

### 1. 启动应用

```bash
cd d:\workspace\workspace\json-viewer
npm run dev
```

### 2. 访问演示页面

在浏览器中打开：http://localhost:5173

### 3. 导入 JSON Schema

点击工具栏的 **"📥 导入 Schema"** 按钮，选择 JSON Schema 文件。

## 使用方式

### 方式一：使用示例 Schema

项目提供了示例 Schema 文件：

```bash
examples/user-schema.json
```

这个 Schema 包含：
- 字符串字段（姓名、邮箱、电话）
- 数值字段（年龄）
- 枚举字段（性别）
- 嵌套对象（地址）
- 数组字段（爱好）
- 布尔字段（是否激活）

### 方式二：创建自己的 Schema

创建一个 JSON Schema 文件，例如 `my-schema.json`：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "我的数据",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "名称"
    },
    "age": {
      "type": "integer",
      "title": "年龄",
      "minimum": 0
    }
  },
  "required": ["name"]
}
```

### 方式三：从代码导入

```typescript
import { useSchemaProcessor } from './hooks/useSchemaProcessor';

function MyComponent() {
  const { loadSchema, schema, formData, updateFormData } = useSchemaProcessor();

  const handleLoad = async () => {
    const schemaText = JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    });
    
    await loadSchema(schemaText);
  };

  return (
    <div>
      <button onClick={handleLoad}>加载 Schema</button>
      {schema && (
        <SchemaForm
          schema={schema}
          formData={formData}
          onChange={updateFormData}
        />
      )}
    </div>
  );
}
```

## 功能说明

### 工具栏按钮

- **📥 导入 Schema**：从文件导入 JSON Schema
- **💾 导出 JSON**：将生成的 JSON 数据保存到文件
- **📋 复制到剪贴板**：复制 JSON 到剪贴板
- **👁️ 显示/隐藏 Schema 面板**：切换 Schema 结构面板

### 表单操作

1. **填写数据**：在表单中输入数据
2. **实时验证**：输入时自动验证数据是否符合 Schema
3. **查看 JSON**：右侧实时显示生成的 JSON
4. **导出/复制**：保存或复制生成的 JSON

### Schema 面板

显示 Schema 的结构信息：
- 字段名称
- 字段类型
- 是否必填
- 字段描述
- 嵌套结构

## 支持的 Schema 特性

### 基础类型

```json
{
  "type": "string",
  "type": "number",
  "type": "integer",
  "type": "boolean",
  "type": "null"
}
```

### 对象类型

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer" }
  },
  "required": ["name"]
}
```

### 数组类型

```json
{
  "type": "array",
  "items": {
    "type": "string"
  },
  "minItems": 1,
  "maxItems": 10
}
```

### 枚举值

```json
{
  "type": "string",
  "enum": ["男", "女", "其他"]
}
```

### 字符串约束

```json
{
  "type": "string",
  "minLength": 2,
  "maxLength": 50,
  "pattern": "^[A-Z][a-z]*$"
}
```

### 数值约束

```json
{
  "type": "number",
  "minimum": 0,
  "maximum": 100,
  "exclusiveMinimum": 0,
  "exclusiveMaximum": 100
}
```

### 格式验证

```json
{
  "type": "string",
  "format": "email"
}
```

支持的格式：
- `email`：邮箱
- `uri` / `url`：URL
- `date`：日期 (YYYY-MM-DD)
- `time`：时间 (HH:MM:SS)
- `date-time`：日期时间
- `ipv4` / `ipv6`：IP 地址
- `uuid`：UUID

### 默认值

```json
{
  "type": "string",
  "default": "默认值"
}
```

### 嵌套结构

```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "address": {
          "type": "object",
          "properties": {
            "city": { "type": "string" },
            "street": { "type": "string" }
          }
        }
      }
    }
  }
}
```

## 常见问题

### Q: 如何验证 Schema 是否正确？

A: 导入 Schema 时会自动验证，如果有错误会在页面上显示错误信息。

### Q: 生成的 JSON 不符合预期？

A: 检查 Schema 的 `required` 字段，确保必填字段都已填写。

### Q: 如何自定义表单样式？

A: 修改 `src/components/SchemaForm/SchemaForm.module.css` 文件。

### Q: 支持 JSON Schema 的哪些版本？

A: 支持 Draft-07 及以上版本。

## API 参考

### useSchemaProcessor Hook

```typescript
const {
  schema,              // 当前 Schema
  formData,            // 表单数据
  validationErrors,    // 验证错误
  loadSchema,          // 加载 Schema
  validateSchema,      // 验证 Schema
  updateFormData,      // 更新表单数据
  generateJson,        // 生成 JSON 字符串
} = useSchemaProcessor();
```

### SchemaForm 组件

```typescript
<SchemaForm
  schema={schema}              // JSON Schema
  formData={formData}          // 表单数据
  onChange={updateFormData}    // 数据变更回调
  onSubmit={() => {}}          // 提交回调（可选）
  uiSchema={uiSchema}          // UI 配置（可选）
/>
```

### SchemaPanel 组件

```typescript
<SchemaPanel
  schema={schema}              // JSON Schema
  onClose={() => {}}           // 关闭回调
/>
```

## 示例代码

### 完整示例

```typescript
import { DemoPage } from './components/SchemaForm/DemoPage';

function App() {
  return <DemoPage />;
}
```

### 自定义集成

```typescript
import { useSchemaProcessor } from './hooks/useSchemaProcessor';
import { SchemaForm } from './components/SchemaForm/SchemaForm';
import { SchemaPanel } from './components/SchemaPanel/SchemaPanel';

function MyPage() {
  const { schema, formData, loadSchema, updateFormData, generateJson } = useSchemaProcessor();

  return (
    <div>
      <button onClick={() => loadSchema(mySchemaText)}>
        加载 Schema
      </button>
      
      {schema && (
        <>
          <SchemaPanel schema={schema} onClose={() => {}} />
          <SchemaForm
            schema={schema}
            formData={formData}
            onChange={updateFormData}
          />
          <pre>{generateJson()}</pre>
        </>
      )}
    </div>
  );
}
```

## 下一步

1. 尝试导入 `examples/user-schema.json` 示例
2. 创建自己的 JSON Schema
3. 自定义表单样式
4. 集成到你的项目中

## 技术支持

如有问题，请查看：
- [设计方案](./doc/schema-to-json-design.md)
- [集成指南](./SCHEMA_INTEGRATION.md)
- [react-jsonschema-form 文档](https://react-jsonschema-form.readthedocs.io/)
