import { JsonTreeNode, JsonNodeType } from '../types';

let nodeIdCounter = 0;

function getNextId(): string {
  return `node_${++nodeIdCounter}`;
}

export function resetNodeIdCounter() {
  nodeIdCounter = 0;
}

function getType(value: unknown): JsonNodeType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as JsonNodeType;
}

function toNode(key: string, value: unknown): JsonTreeNode {
  const type = getType(value);
  const node: JsonTreeNode = {
    id: getNextId(),
    key,
    value,
    type,
    isOpen: true,
  };

  if (type === 'object' && value !== null) {
    node.children = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => toNode(k, v)
    );
  } else if (type === 'array') {
    node.children = (value as unknown[]).map((item, index) =>
      toNode(String(index), item)
    );
  }

  return node;
}

/**
 * 将解析后的 JSON 值转换为树节点数组
 */
export function jsonToTree(value: unknown): JsonTreeNode[] {
  return [toNode('root', value)];
}

/**
 * 将树节点转换为 JSON 值
 */
export function treeToJson(nodes: JsonTreeNode[]): unknown {
  if (nodes.length === 0) return undefined;
  if (nodes.length === 1) {
    return nodeToValue(nodes[0]);
  }
  return nodes.map(nodeToValue);
}

function nodeToValue(node: JsonTreeNode): unknown {
  switch (node.type) {
    case 'object': {
      if (!node.children) return {};
      const obj: Record<string, unknown> = {};
      for (const child of node.children) {
        obj[child.key] = nodeToValue(child);
      }
      return obj;
    }
    case 'array': {
      if (!node.children) return [];
      return node.children.map(child => nodeToValue(child));
    }
    case 'null':
      return null;
    case 'number':
      return Number(node.value);
    case 'boolean':
      return node.value === true || node.value === 'true';
    default:
      return String(node.value);
  }
}
