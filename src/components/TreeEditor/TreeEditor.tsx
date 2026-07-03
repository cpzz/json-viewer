import { useCallback } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { JsonTreeNode } from '../../types';
import { TreeNode } from './TreeNode';
import styles from './TreeEditor.module.css';

interface TreeEditorProps {
  data: JsonTreeNode[];
  onChange: (data: JsonTreeNode[]) => void;
}

export function TreeEditor({ data, onChange }: TreeEditorProps) {
  const handleMove = useCallback(
    ({ dragIds, parentId }: { dragIds: string[]; parentId: string | null; index: number }) => {
      // react-arborist handles visual reordering; data sync
      // would be done here for full persistence.
      if (!dragIds.length || !parentId) return;
    },
    []
  );

  const handleToggle = useCallback(
    (id: string) => {
      const updateTree = (nodes: JsonTreeNode[]): JsonTreeNode[] =>
        nodes.map(node => {
          if (node.id === id) {
            return { ...node, isOpen: !node.isOpen };
          }
          if (node.children) {
            return { ...node, children: updateTree(node.children) };
          }
          return node;
        });
      onChange(updateTree(data));
    },
    [data, onChange]
  );

  if (data.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>打开一个 JSON 文件开始编辑</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Tree
        data={data}
        onMove={handleMove}
        onToggle={handleToggle}
        openByDefault={false}
        rowHeight={32}
        indent={20}
        padding={8}
        width="100%"
        height="100%"
      >
        {(props: NodeRendererProps<JsonTreeNode>) => <TreeNode {...props} />}
      </Tree>
    </div>
  );
}
