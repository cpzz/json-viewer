import { useState, useRef, useEffect, useCallback } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { JsonTreeNode } from '../../types';
import { updateNode, removeNode, addChild } from '../../utils/treeUtils';
import { TreeNode } from './TreeNode';
import styles from './TreeEditor.module.css';

interface TreeEditorProps {
  data: JsonTreeNode[];
  onChange: (data: JsonTreeNode[]) => void;
  activeNodeId: string | null;
  onSelectNode: (id: string) => void;
}

let newIdCounter = 0;
function genId(): string {
  return `new_${Date.now()}_${++newIdCounter}`;
}

export function TreeEditor({ data, onChange, activeNodeId, onSelectNode }: TreeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<JsonTreeNode>) => {
      const newTree = updateNode(data, id, node => ({ ...node, ...updates }));
      onChange(newTree);
    },
    [data, onChange]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const newTree = removeNode(data, id);
      onChange(newTree);
    },
    [data, onChange]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const newNode: JsonTreeNode = {
        id: genId(),
        key: 'newKey',
        value: '',
        type: 'string',
      };
      const newTree = addChild(data, parentId, newNode);
      onChange(newTree);
    },
    [data, onChange]
  );

  return (
    <div ref={containerRef} className={styles.container}>
      {data.length === 0 ? (
        <div className={styles.empty}>打开一个 JSON 文件开始编辑</div>
      ) : dimensions.height > 0 ? (
        <Tree
          data={data}
          width={dimensions.width}
          height={dimensions.height}
          openByDefault={true}
          rowHeight={32}
          indent={20}
          padding={8}
        >
          {(props: NodeRendererProps<JsonTreeNode>) => (
            <TreeNode
              {...props}
              activeNodeId={activeNodeId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
              onSelectNode={onSelectNode}
            />
          )}
        </Tree>
      ) : null}
    </div>
  );
}
