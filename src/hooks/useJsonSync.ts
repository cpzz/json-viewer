import { useState, useRef, useCallback } from 'react';
import { JsonTreeNode } from '../types';
import { jsonToTree, treeToJson } from '../utils/jsonUtils';
import { buildPositionMap, PositionInfo } from '../utils/positionMap';

export function useJsonSync() {
  const [jsonText, setJsonText] = useState('');
  const [treeData, setTreeData] = useState<JsonTreeNode[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [positionMap, setPositionMap] = useState<Map<string, PositionInfo>>(new Map());

  const isUpdatingFromTreeRef = useRef(false);
  const treeUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFromTree = useCallback((newTree: JsonTreeNode[]) => {
    isUpdatingFromTreeRef.current = true;
    setTreeData(newTree);
    try {
      const json = treeToJson(newTree);
      const text = JSON.stringify(json, null, 2);
      setJsonText(text);
      setPositionMap(buildPositionMap(newTree));
      setParseError(null);
    } catch (e) {
      setParseError(`序列化错误: ${(e as Error).message}`);
    }
    setTimeout(() => {
      isUpdatingFromTreeRef.current = false;
    }, 0);
  }, []);

  const updateFromCode = useCallback((newText: string) => {
    if (isUpdatingFromTreeRef.current) return;

    setJsonText(newText);

    if (treeUpdateTimerRef.current) {
      clearTimeout(treeUpdateTimerRef.current);
    }
    treeUpdateTimerRef.current = setTimeout(() => {
      try {
        if (newText.trim()) {
          const parsed = JSON.parse(newText);
          const tree = jsonToTree(parsed);
          setTreeData(tree);
          setPositionMap(buildPositionMap(tree));
        } else {
          setTreeData([]);
          setPositionMap(new Map());
        }
        setParseError(null);
      } catch (e) {
        setParseError((e as Error).message);
      }
    }, 300);
  }, []);

  return { jsonText, treeData, parseError, positionMap, updateFromTree, updateFromCode };
}
