import { useState } from 'react';
import { useSchemaProcessor } from '../../hooks/useSchemaProcessor';
import { SchemaForm } from './SchemaForm';
import { SchemaPanel } from '../SchemaPanel/SchemaPanel';
import { formToJsonTree } from '../../utils/schemaTransform';
import styles from './DemoPage.module.css';

export function DemoPage() {
  const { schema, formData, validationErrors, loadSchema, updateFormData, generateJson } = useSchemaProcessor();
  const [showSchemaPanel, setShowSchemaPanel] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);

  // 导入 Schema 文件
  const handleImportSchema = async () => {
    try {
      setImportError(null);

      // 使用 Electron 的文件对话框
      if (window.electronAPI?.openFile) {
        const result = await window.electronAPI.openFile();

        if (!result.filePath) {
          return;
        }

        const content = await window.electronAPI.readFile(result.filePath);
        const loadResult = await loadSchema(content);

        if (!loadResult.success) {
          setImportError(loadResult.error || 'Schema 加载失败');
        }
      } else {
        // 降级方案：使用文件输入
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const text = await file.text();
          const loadResult = await loadSchema(text);

          if (!loadResult.success) {
            setImportError(loadResult.error || 'Schema 加载失败');
          }
        };

        input.click();
      }
    } catch (error) {
      setImportError(`导入失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 导出 JSON
  const handleExportJson = () => {
    const jsonText = generateJson();
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 复制到剪贴板
  const handleCopyToClipboard = () => {
    const jsonText = generateJson();
    navigator.clipboard.writeText(jsonText);
    alert('JSON 已复制到剪贴板');
  };

  return (
    <div className={styles.container}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <button onClick={handleImportSchema} className={styles.btn}>
          📥 导入 Schema
        </button>

        {schema && (
          <>
            <button onClick={handleExportJson} className={styles.btn}>
              💾 导出 JSON
            </button>
            <button onClick={handleCopyToClipboard} className={styles.btn}>
              📋 复制到剪贴板
            </button>
            <button
              onClick={() => setShowSchemaPanel(!showSchemaPanel)}
              className={styles.btn}
            >
              {showSchemaPanel ? '🙈 隐藏' : '👁️ 显示'} Schema 面板
            </button>
          </>
        )}
      </div>

      {/* 错误提示 */}
      {importError && (
        <div className={styles.error}>
          ❌ {importError}
          <button onClick={() => setImportError(null)} className={styles.closeBtn}>×</button>
        </div>
      )}

      {/* 验证错误 */}
      {validationErrors.length > 0 && (
        <div className={styles.error}>
          <strong>Schema 验证错误:</strong>
          <ul>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err.path}: {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 主内容区 */}
      <div className={styles.main}>
        {schema ? (
          <>
            {/* Schema 面板 */}
            {showSchemaPanel && (
              <SchemaPanel
                schema={schema}
                onClose={() => setShowSchemaPanel(false)}
              />
            )}

            {/* 表单区域 */}
            <div className={styles.formArea}>
              <SchemaForm
                schema={schema}
                formData={formData}
                onChange={updateFormData}
              />
            </div>

            {/* JSON 预览 */}
            <div className={styles.jsonPreview}>
              <h3>生成的 JSON</h3>
              <pre>{generateJson()}</pre>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <p>👆 点击"导入 Schema"按钮开始</p>
            <p>支持 JSON Schema Draft-07 及以上版本</p>
          </div>
        )}
      </div>
    </div>
  );
}
