import { useMemo } from 'react';
import { JsonSchema } from '../../hooks/useSchemaProcessor';
import { X } from 'lucide-react';
import styles from './SchemaPanel.module.css';

interface SchemaPanelProps {
  schema: JsonSchema;
  onClose: () => void;
}

export function SchemaPanel({ schema, onClose }: SchemaPanelProps) {
  const schemaInfo = useMemo(() => {
    return extractSchemaInfo(schema);
  }, [schema]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Schema 结构</h3>
        <button className={styles.closeBtn} onClick={onClose} title="关闭">
          <X size={16} />
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>基本信息</h4>
          <div className={styles.infoRow}>
            <span className={styles.label}>标题:</span>
            <span className={styles.value}>{schema.title || '(未设置)'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>类型:</span>
            <span className={styles.value}>{schema.type || 'object'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>描述:</span>
            <span className={styles.value}>{schema.description || '(无)'}</span>
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>字段结构</h4>
          <div className={styles.tree}>
            {schemaInfo.map((field) => (
              <FieldNode key={field.path} field={field} level={0} />
            ))}
          </div>
        </div>

        {schema.required && schema.required.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>必填字段</h4>
            <div className={styles.requiredList}>
              {schema.required.map((field) => (
                <span key={field} className={styles.requiredTag}>
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FieldInfo {
  name: string;
  path: string;
  type: string;
  required: boolean;
  description?: string;
  children?: FieldInfo[];
}

function extractSchemaInfo(schema: JsonSchema): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const requiredSet = new Set(schema.required || []);

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      fields.push({
        name: key,
        path: key,
        type: prop.type || 'any',
        required: requiredSet.has(key),
        description: prop.description,
        children: prop.properties ? extractSchemaInfo(prop) : undefined,
      });
    }
  }

  return fields;
}

interface FieldNodeProps {
  field: FieldInfo;
  level: number;
}

function FieldNode({ field, level }: FieldNodeProps) {
  return (
    <div className={styles.fieldNode} style={{ paddingLeft: level * 16 }}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldName}>
          {field.name}
          {field.required && <span className={styles.requiredMark}>*</span>}
        </span>
        <span className={styles.fieldType}>{field.type}</span>
      </div>
      {field.description && (
        <div className={styles.fieldDescription}>{field.description}</div>
      )}
      {field.children && field.children.length > 0 && (
        <div className={styles.fieldChildren}>
          {field.children.map((child) => (
            <FieldNode key={child.path} field={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
