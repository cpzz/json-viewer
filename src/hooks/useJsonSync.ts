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

  const updateFromCode = useCallback((newText: string, immediate?: boolean) => {
    if (isUpdatingFromTreeRef.current) return;

    setJsonText(newText);

    if (treeUpdateTimerRef.current) {
      clearTimeout(treeUpdateTimerRef.current);
      treeUpdateTimerRef.current = null;
    }

    if (immediate) {
      // 文件加载时同步解析，避免 treeData 延迟导致切换文件后聚焦不准确
      try {
        if (newText.trim()) {
          const parsed = JSON.parse(newText);
          const formatted = JSON.stringify(parsed, null, 2);
          const tree = jsonToTree(parsed);
          setJsonText(formatted);
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
    } else {
      treeUpdateTimerRef.current = setTimeout(() => {
        try {
          if (newText.trim()) {
            const parsed = JSON.parse(newText);
            const formatted = JSON.stringify(parsed, null, 2);
            const tree = jsonToTree(parsed);
            setJsonText(formatted);
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
    }
  }, []);

  return { jsonText, treeData, parseError, positionMap, updateFromTree, updateFromCode, isUpdatingFromTreeRef };
}
