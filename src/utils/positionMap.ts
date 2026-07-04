import { JsonTreeNode } from '../types';

export interface PositionInfo {
  startLine: number; // 1-based
  endLine: number;   // 1-based
}

/**
 * 基于 JSON 文本和树结构，建立每个树节点对应的行号范围
 * 依赖 JSON.stringify(json, null, 2) 的 2 空格缩进格式
 */
export function buildPositionMap(
  tree: JsonTreeNode[]
): Map<string, PositionInfo> {
  const map = new Map<string, PositionInfo>();
  let lineIndex = 0;

  function traverse(node: JsonTreeNode): void {
    const startLine = lineIndex + 1;

    if (node.type === 'object' || node.type === 'array') {
      if (!node.children || node.children.length === 0) {
        // 空对象/数组，"key": {} 占一行
        lineIndex++;
      } else {
        lineIndex++; // 跳过 "key": { 或 "key": [
        for (const child of node.children) {
          traverse(child);
        }
        lineIndex++; // 跳过 } 或 ]
      }
    } else {
      // 叶子节点，占一行
      lineIndex++;
    }

    map.set(node.id, { startLine, endLine: lineIndex });
  }

  for (const node of tree) {
    traverse(node);
  }

  return map;
}

/**
 * 根据行号查找最内层的节点 id
 */
export function findNodeIdByLine(
  positionMap: Map<string, PositionInfo>,
  lineNumber: number
): string | null {
  let bestMatch: string | null = null;
  let bestStartLine = -1;

  for (const [nodeId, info] of positionMap) {
    if (lineNumber >= info.startLine && lineNumber <= info.endLine) {
      // 选 startLine 最大的（最内层节点）
      if (info.startLine > bestStartLine) {
        bestMatch = nodeId;
        bestStartLine = info.startLine;
      }
    }
  }

  return bestMatch;
}
