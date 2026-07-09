import { JsonTreeNode, JsonNodeType } from '../types';
import { JsonSchema } from '../hooks/useSchemaProcessor';
import { findNode } from './treeUtils';
import { jsonToTree } from './jsonUtils';

let schemaNodeIdCounter = 0;

function genSchemaNodeId(): string {
  return `schema_${Date.now()}_${++schemaNodeIdCounter}`;
}

export function schemaTypeToNodeType(schemaType?: string): JsonNodeType {
  switch (schemaType) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    default:
      return 'string';
  }
}

function resolveRef(schema: JsonSchema, rootSchema: JsonSchema): JsonSchema {
  if (!schema.$ref || !rootSchema.definitions) return schema;
  const name = schema.$ref.replace('#/definitions/', '');
  return rootSchema.definitions[name] ?? schema;
}

export function generateDefaultValue(schema: JsonSchema, rootSchema?: JsonSchema): unknown {
  const resolved = rootSchema ? resolveRef(schema, rootSchema) : schema;

  if (resolved.default !== undefined) return resolved.default;
  if (resolved.enum && resolved.enum.length > 0) return resolved.enum[0];

  const type = resolved.type ?? 'string';
  switch (type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'array':
      return [];
    case 'object': {
      const obj: Record<string, unknown> = {};
      if (resolved.properties) {
        for (const [key, prop] of Object.entries(resolved.properties)) {
          obj[key] = generateDefaultValue(prop, rootSchema);
        }
      }
      return obj;
    }
    default:
      return '';
  }
}

export function generateDefaultData(schema: JsonSchema): unknown {
  if (schema.type === 'object' || schema.properties) {
    return generateDefaultValue({ ...schema, type: 'object' }, schema);
  }
  return generateDefaultValue(schema, schema);
}

export function populateTreeFromSchema(schema: JsonSchema): JsonTreeNode[] {
  return jsonToTree(generateDefaultData(schema));
}

export function getNodePath(nodes: JsonTreeNode[], nodeId: string): string[] | null {
  const path: string[] = [];

  function walk(current: JsonTreeNode[], target: string): boolean {
    for (const node of current) {
      path.push(node.key);
      if (node.id === target) return true;
      if (node.children && walk(node.children, target)) return true;
      path.pop();
    }
    return false;
  }

  return walk(nodes, nodeId) ? [...path] : null;
}

export function resolveNodeSchema(
  rootSchema: JsonSchema,
  nodes: JsonTreeNode[],
  nodeId: string
): JsonSchema | null {
  const path = getNodePath(nodes, nodeId);
  if (!path) return null;

  let current = rootSchema;

  for (let i = 1; i < path.length; i++) {
    current = resolveRef(current, rootSchema);
    const key = path[i];

    if (current.type === 'object' || current.properties || current.patternProperties) {
      const childSchema = resolveObjectChildSchema(current, key, rootSchema);
      if (!childSchema) return null;
      current = childSchema;
      continue;
    }

    if (current.type === 'array' && current.items) {
      if (Array.isArray(current.items)) {
        const index = parseInt(key, 10);
        current = !Number.isNaN(index) && index < current.items.length
          ? current.items[index]
          : current.items[current.items.length - 1];
      } else {
        current = current.items;
      }
      continue;
    }

    return null;
  }

  return resolveRef(current, rootSchema);
}

export function matchPatternPropertySchema(
  schema: JsonSchema,
  key: string,
  rootSchema: JsonSchema
): JsonSchema | null {
  const resolved = resolveRef(schema, rootSchema);
  if (!resolved.patternProperties) return null;

  for (const [pattern, subSchema] of Object.entries(resolved.patternProperties)) {
    try {
      if (new RegExp(pattern).test(key)) {
        return resolveRef(subSchema as JsonSchema, rootSchema);
      }
    } catch {
      // 忽略无效正则
    }
  }
  return null;
}

export function validatePatternKey(key: string, pattern: string): boolean {
  try {
    return new RegExp(pattern).test(key);
  } catch {
    return false;
  }
}

export interface PatternAddOption {
  pattern: string;
  label: string;
  description?: string;
  valueSchema: JsonSchema;
}

export function getPatternAddOptions(
  rootSchema: JsonSchema,
  nodes: JsonTreeNode[],
  nodeId: string
): PatternAddOption[] {
  const nodeSchema = resolveNodeSchema(rootSchema, nodes, nodeId);
  if (!nodeSchema?.patternProperties) return [];

  const patterns = Object.entries(nodeSchema.patternProperties);
  const multi = patterns.length > 1;

  return patterns.map(([pattern, subSchema]) => {
    const resolved = resolveRef(subSchema as JsonSchema, rootSchema);
    return {
      pattern,
      label: multi ? `添加条目 (${pattern})` : '添加条目',
      description: resolved.description || `键须匹配 /${pattern}/`,
      valueSchema: resolved,
    };
  });
}

function resolveObjectChildSchema(
  schema: JsonSchema,
  key: string,
  rootSchema: JsonSchema
): JsonSchema | null {
  const resolved = resolveRef(schema, rootSchema);
  const prop = resolved.properties?.[key];
  if (prop) return resolveRef(prop, rootSchema);
  return matchPatternPropertySchema(resolved, key, rootSchema);
}

function getChildSchema(
  parentSchema: JsonSchema,
  child: JsonTreeNode,
  rootSchema: JsonSchema
): JsonSchema | null {
  const resolved = resolveRef(parentSchema, rootSchema);

  if (resolved.type === 'object' || resolved.properties || resolved.patternProperties) {
    const childSchema = resolveObjectChildSchema(resolved, child.key, rootSchema);
    return childSchema;
  }

  if (resolved.type === 'array' && resolved.items) {
    if (Array.isArray(resolved.items)) {
      const index = parseInt(child.key, 10);
      if (!Number.isNaN(index) && index < resolved.items.length) {
        return resolveRef(resolved.items[index], rootSchema);
      }
      return resolveRef(resolved.items[resolved.items.length - 1], rootSchema);
    }
    return resolveRef(resolved.items, rootSchema);
  }

  return null;
}

/** 按 Schema 递归创建节点，object 固定子字段全部自动生成，array 初始为空 */
export function createTreeNodeFromSchema(
  key: string,
  propSchema: JsonSchema,
  rootSchema?: JsonSchema
): JsonTreeNode {
  const root = rootSchema ?? propSchema;
  const resolved = resolveRef(propSchema, root);
  const type = schemaTypeToNodeType(resolved.type);

  if (type === 'object') {
    const children: JsonTreeNode[] = [];
    if (resolved.properties) {
      for (const [childKey, childProp] of Object.entries(resolved.properties)) {
        children.push(createTreeNodeFromSchema(childKey, childProp, root));
      }
    }
    return { id: genSchemaNodeId(), key, value: null, type: 'object', children, isOpen: true };
  }

  if (type === 'array') {
    return { id: genSchemaNodeId(), key, value: null, type: 'array', children: [], isOpen: true };
  }

  return {
    id: genSchemaNodeId(),
    key,
    value: generateDefaultValue(resolved, root),
    type,
  };
}

export interface ArrayAddOption {
  id: string;
  label: string;
  description?: string;
  type: JsonNodeType;
  itemSchema: JsonSchema;
}

export function getArrayAddOptions(
  rootSchema: JsonSchema,
  nodes: JsonTreeNode[],
  nodeId: string
): ArrayAddOption[] {
  const node = findNode(nodes, nodeId);
  if (!node || node.type !== 'array') return [];

  const nodeSchema = resolveNodeSchema(rootSchema, nodes, nodeId);
  if (!nodeSchema?.items) return [];

  if (Array.isArray(nodeSchema.items)) {
    return nodeSchema.items.map((item, index) => {
      const resolved = resolveRef(item, rootSchema);
      const type = schemaTypeToNodeType(resolved.type);
      return {
        id: `tuple-${index}`,
        label: `添加 ${resolved.title || type} 项`,
        description: resolved.description || `元组第 ${index + 1} 项`,
        type,
        itemSchema: resolved,
      };
    });
  }

  const resolved = resolveRef(nodeSchema.items, rootSchema);
  const type = schemaTypeToNodeType(resolved.type);
  return [{
    id: 'array-item',
    label: '添加一项',
    description: resolved.title || resolved.description || type,
    type,
    itemSchema: resolved,
  }];
}

export function createArrayItemNode(
  itemSchema: JsonSchema,
  nodes: JsonTreeNode[],
  parentId: string,
  rootSchema?: JsonSchema
): JsonTreeNode | null {
  const parent = findNode(nodes, parentId);
  if (!parent || parent.type !== 'array') return null;

  const root = rootSchema ?? itemSchema;
  const nextIndex = getNextArrayIndex(parent.children ?? []);
  return createTreeNodeFromSchema(nextIndex, itemSchema, root);
}

function getNextArrayIndex(children: JsonTreeNode[]): string {
  if (children.length === 0) return '0';
  const indices = children
    .map(child => parseInt(child.key, 10))
    .filter(index => !Number.isNaN(index));
  return String(Math.max(...indices, -1) + 1);
}

/** 将 Schema 定义的固定字段补全到已有树中，不覆盖已有值 */
export function mergeSchemaIntoTree(
  nodes: JsonTreeNode[],
  rootSchema: JsonSchema
): JsonTreeNode[] {
  function mergeNode(node: JsonTreeNode, nodeSchema: JsonSchema | null): JsonTreeNode {
    if (!nodeSchema) {
      if (node.children) {
        return { ...node, children: node.children.map(child => mergeNode(child, null)) };
      }
      return node;
    }

    const resolved = resolveRef(nodeSchema, rootSchema);

    if (node.type === 'object' && (resolved.type === 'object' || resolved.properties || resolved.patternProperties)) {
      const childMap = new Map((node.children ?? []).map(child => [child.key, child]));
      const children: JsonTreeNode[] = [];

      if (resolved.properties) {
        for (const [key, prop] of Object.entries(resolved.properties)) {
          const childSchema = resolveRef(prop, rootSchema);
          const existing = childMap.get(key);
          if (existing) {
            children.push(mergeNode(existing, childSchema));
            childMap.delete(key);
          } else {
            children.push(createTreeNodeFromSchema(key, childSchema, rootSchema));
          }
        }
      }

      for (const extra of childMap.values()) {
        const childSchema = getChildSchema(resolved, extra, rootSchema);
        children.push(mergeNode(extra, childSchema));
      }

      return { ...node, children };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => {
          const childSchema = getChildSchema(resolved, child, rootSchema);
          return mergeNode(child, childSchema);
        }),
      };
    }

    return node;
  }

  if (nodes.length === 0) {
    return populateTreeFromSchema(rootSchema);
  }

  return nodes.map(node => {
    const isRoot = node.key === 'root';
    const nodeSchema = isRoot ? rootSchema : null;
    return mergeNode(node, nodeSchema);
  });
}

export function hasMissingSchemaFields(
  nodes: JsonTreeNode[],
  rootSchema: JsonSchema,
  nodeId: string
): boolean {
  const node = findNode(nodes, nodeId);
  if (!node || node.type !== 'object') return false;

  const nodeSchema = resolveNodeSchema(rootSchema, nodes, nodeId);
  if (!nodeSchema?.properties) return false;

  const existingKeys = new Set((node.children ?? []).map(child => child.key));
  return Object.keys(nodeSchema.properties).some(key => !existingKeys.has(key));
}

export function isTreeEmpty(nodes: JsonTreeNode[]): boolean {
  if (nodes.length === 0) return true;
  if (nodes.length === 1 && nodes[0].key === 'root') {
    const root = nodes[0];
    if (root.type === 'object') return (root.children?.length ?? 0) === 0;
    if (root.type === 'array') return (root.children?.length ?? 0) === 0;
  }
  return false;
}

export function treeStructureChanged(a: JsonTreeNode[], b: JsonTreeNode[]): boolean {
  const stripIds = (nodes: JsonTreeNode[]): unknown =>
    nodes.map(n => ({
      key: n.key,
      type: n.type,
      value: n.type === 'object' || n.type === 'array' ? undefined : n.value,
      children: n.children ? stripIds(n.children) : undefined,
    }));
  return JSON.stringify(stripIds(a)) !== JSON.stringify(stripIds(b));
}
