import { useMemo } from 'react';
import { JsonSchema } from '../../hooks/useSchemaProcessor';
import styles from './SchemaPanel.module.css';

interface SchemaPanelProps {
  schema: JsonSchema;
  onClose?: () => void;
}

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  children?: SchemaField[];
}

export function SchemaPanel({ schema, onClose }: SchemaPanelProps) {
  const fields = useMemo(() => parseSchemaFields(schema), [schema]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>{schema.title || 'JSON Schema'}</h3>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} title="关闭">
            ×
          </button>
        )}
      </div>
      {schema.description && (
        <p className={styles.description}>{schema.description}</p>
      )}
      <div className={styles.fieldList}>
        {fields.length > 0 ? (
          fields.map(field => (
            <SchemaFieldItem key={field.name} field={field} depth={0} />
          ))
        ) : (
          <p className={styles.empty}>无字段定义</p>
        )}
      </div>
    </div>
  );
}

function SchemaFieldItem({ field, depth }: { field: SchemaField; depth: number }) {
  return (
    <div className={styles.fieldItem} style={{ paddingLeft: depth * 16 }}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldName}>{field.name}</span>
        <span className={styles.fieldType}>{field.type}</span>
        {field.required && <span className={styles.required}>必填</span>}
      </div>
      {field.description && (
        <p className={styles.fieldDesc}>{field.description}</p>
      )}
      {field.children?.map(child => (
        <SchemaFieldItem key={child.name} field={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function parseSchemaFields(schema: JsonSchema, required: string[] = []): SchemaField[] {
  if (!schema.properties) return [];

  return Object.entries(schema.properties).map(([name, prop]) => {
    const field: SchemaField = {
      name,
      type: prop.type || 'any',
      required: required.includes(name),
      description: prop.description,
    };

    if (prop.type === 'object' && prop.properties) {
      field.children = parseSchemaFields(prop, prop.required || []);
    } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
      field.children = parseSchemaFields(prop.items, prop.items.required || []);
    }

    return field;
  });
}
