import { JsonTreeNode } from '../types';

export function findNode(nodes: JsonTreeNode[], id: string): JsonTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateNode(
  nodes: JsonTreeNode[],
  id: string,
  updater: (node: JsonTreeNode) => JsonTreeNode
): JsonTreeNode[] {
  return nodes.map(node => {
    if (node.id === id) return updater(node);
    if (node.children) {
      return { ...node, children: updateNode(node.children, id, updater) };
    }
    return node;
  });
}

export function removeNode(nodes: JsonTreeNode[], id: string): JsonTreeNode[] {
  return nodes
    .filter(node => node.id !== id)
    .map(node => {
      if (node.children) {
        return { ...node, children: removeNode(node.children, id) };
      }
      return node;
    });
}

export function addChild(
  nodes: JsonTreeNode[],
  parentId: string,
  newNode: JsonTreeNode
): JsonTreeNode[] {
  return nodes.map(node => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode],
      };
    }
    if (node.children) {
      return { ...node, children: addChild(node.children, parentId, newNode) };
    }
    return node;
  });
}

export function moveNode(
  nodes: JsonTreeNode[],
  dragId: string,
  targetParentId: string,
  targetIndex: number
): { result: JsonTreeNode[]; moved: JsonTreeNode | null } {
  let moved: JsonTreeNode | null = null;

  // 先移除节点
  const removeResult = removeNodeInternal(nodes, dragId);
  moved = removeResult.removed;
  if (!moved) return { result: nodes, moved: null };

  // 再插入到目标位置
  const result = insertNode(removeResult.nodes, targetParentId, targetIndex, moved);
  return { result, moved };
}

function removeNodeInternal(
  nodes: JsonTreeNode[],
  id: string
): { nodes: JsonTreeNode[]; removed: JsonTreeNode | null } {
  let removed: JsonTreeNode | null = null;

  const filtered = nodes.filter(node => {
    if (node.id === id) {
      removed = node;
      return false;
    }
    return true;
  });

  const result = filtered.map(node => {
    if (node.children) {
      const sub = removeNodeInternal(node.children, id);
      if (sub.removed) removed = sub.removed;
      return { ...node, children: sub.nodes };
    }
    return node;
  });

  return { nodes: result, removed };
}

function insertNode(
  nodes: JsonTreeNode[],
  parentId: string,
  index: number,
  node: JsonTreeNode
): JsonTreeNode[] {
  return nodes.map(n => {
    if (n.id === parentId) {
      const children = [...(n.children || [])];
      children.splice(index, 0, node);
      return { ...n, children };
    }
    if (n.children) {
      return { ...n, children: insertNode(n.children, parentId, index, node) };
    }
    return n;
  });
}
