import { useState, useRef, useCallback } from 'react';
import { JsonTreeNode } from '../types';
import { jsonToTree, treeToJson, resetNodeIdCounter } from '../utils/jsonUtils';

export function useJsonSync() {
  const [jsonText, setJsonText] = useState('');
  const [treeData, setTreeData] = useState<JsonTreeNode[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const isUpdatingRef = useRef(false);

  const updateFromTree = useCallback((newTree: JsonTreeNode[]) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    try {
      const json = treeToJson(newTree);
      const text = JSON.stringify(json, null, 2);
      setJsonText(text);
      setParseError(null);
    } catch (e) {
      setParseError(`序列化错误: ${(e as Error).message}`);
    }
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, []);

  const updateFromCode = useCallback((newText: string) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    try {
      if (newText.trim()) {
        const parsed = JSON.parse(newText);
        resetNodeIdCounter();
        const tree = jsonToTree(parsed);
        setTreeData(tree);
      } else {
        setTreeData([]);
      }
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, []);

  return { jsonText, treeData, parseError, updateFromTree, updateFromCode, setJsonText };
}
