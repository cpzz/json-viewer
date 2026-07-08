import { JsonTreeNode, JsonNodeType } from '../types';
import { JsonSchema } from '../hooks/useSchemaProcessor';

let idCounter = 0;

function generateId(): string {
  return `schema_${Date.now()}_${++idCounter}`;
}

export function formToJsonTree(formData: Record<string, any>, schema: JsonSchema): JsonTreeNode[] {
  if (!formData || Object.keys(formData).length === 0) {
    return [];
  }

  const rootValue = formData;
  const rootNode = convertToTreeNode(rootValue, schema, 'root', 0);

  return rootNode ? [rootNode] : [];
}

function convertToTreeNode(value: any, schema: JsonSchema, key: string, index: number): JsonTreeNode | null {
  const type = inferType(value, schema);

  if (type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const children: JsonTreeNode[] = [];

    if (schema.properties) {
      for (const [propKey, propSchema] of Object.entries(schema.properties)) {
        const propValue = value[propKey];
        if (propValue !== undefined) {
          const childNode = convertToTreeNode(propValue, propSchema, propKey, children.length);
          if (childNode) {
            children.push(childNode);
          }
        }
      }
    } else {
      for (const [propKey, propValue] of Object.entries(value)) {
        const propSchema = { type: inferTypeFromValue(propValue) };
        const childNode = convertToTreeNode(propValue, propSchema, propKey, children.length);
        if (childNode) {
          children.push(childNode);
        }
      }
    }

    return {
      id: generateId(),
      key,
      value: null,
      type: 'object',
      children,
    };
  }

  if (type === 'array' && Array.isArray(value)) {
    const children: JsonTreeNode[] = [];

    for (let i = 0; i < value.length; i++) {
      const itemValue = value[i];
      const itemSchema = schema.items || { type: inferTypeFromValue(itemValue) };
      const childNode = convertToTreeNode(itemValue, itemSchema, String(i), i);
      if (childNode) {
        children.push(childNode);
      }
    }

    return {
      id: generateId(),
      key,
      value: null,
      type: 'array',
      children,
    };
  }

  return {
    id: generateId(),
    key,
    value,
    type,
  };
}

function inferType(value: any, schema: JsonSchema): JsonNodeType {
  if (schema.type) {
    if (schema.type === 'integer') return 'number';
    return schema.type as JsonNodeType;
  }
  return inferTypeFromValue(value);
}

function inferTypeFromValue(value: any): JsonNodeType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

export function jsonTreeToForm(tree: JsonTreeNode[], schema: JsonSchema): Record<string, any> {
  if (!tree || tree.length === 0) {
    return {};
  }

  const rootNode = tree[0];
  return convertTreeNodeToValue(rootNode, schema);
}

function convertTreeNodeToValue(node: JsonTreeNode, schema: JsonSchema): any {
  if (node.type === 'object') {
    const result: Record<string, any> = {};

    if (node.children) {
      for (const child of node.children) {
        const childSchema = schema.properties?.[child.key] || { type: child.type };
        result[child.key] = convertTreeNodeToValue(child, childSchema);
      }
    }

    return result;
  }

  if (node.type === 'array') {
    const result: any[] = [];

    if (node.children) {
      for (const child of node.children) {
        const childSchema = schema.items || { type: child.type };
        result.push(convertTreeNodeToValue(child, childSchema));
      }
    }

    return result;
  }

  return node.value;
}
