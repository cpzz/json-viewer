import { useState, useRef, useEffect, useCallback } from 'react';
import { Tree, NodeRendererProps, NodeApi } from 'react-arborist';
import { JsonTreeNode, JsonNodeType } from '../../types';
import { updateNode, removeNode, addChild, findParent } from '../../utils/treeUtils';
import { TreeNode } from './TreeNode';
import { AddNodeDialog } from './AddNodeDialog';
import styles from './TreeEditor.module.css';

interface TreeEditorProps {
  data: JsonTreeNode[];
  onChange: (data: JsonTreeNode[]) => void;
  activeNodeId: string | null;
  onSelectNode: (id: string) => void;
  scrollTarget: { id: string; nonce: number } | null;
}

let newIdCounter = 0;
function genId(): string {
  return `new_${Date.now()}_${++newIdCounter}`;
}

export function TreeEditor({ data, onChange, activeNodeId, onSelectNode, scrollTarget }: TreeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<{ scrollTo: (id: string) => void } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pendingAddParentId, setPendingAddParentId] = useState<string | null>(null);
  const pendingScrollRef = useRef<string | null>(null);
  const ignoreFocusRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute('role') === 'treeitem') {
        target.style.outline = 'none';
      }
    };
    containerRef.current.addEventListener('focus', handleFocus, true);
    return () => {
      containerRef.current?.removeEventListener('focus', handleFocus, true);
    };
  }, []);

  useEffect(() => {
    if (!scrollTarget || !treeRef.current) return;
    try {
      treeRef.current.scrollTo(scrollTarget.id);
    } catch {
      // 节点可能不可见或已被删除
    }
  }, [scrollTarget]);

  // 新建节点后滚动到该节点
  useEffect(() => {
    if (!pendingScrollRef.current || !treeRef.current) return;
    try {
      treeRef.current.scrollTo(pendingScrollRef.current);
    } catch {
      // 节点可能还未渲染完成
    }
    pendingScrollRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<JsonTreeNode>) => {
      const newTree = updateNode(data, id, node => ({ ...node, ...updates }));
      onChange(newTree);
    },
    [data, onChange]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await window.electronAPI.showMessageBox({
        type: 'question',
        title: '删除节点',
        message: '确定要删除此节点吗？',
        buttons: ['确定', '取消'],
        cancelId: 1,
      });
      if (result.response !== 0) return;
      let parentId: string | null = null;
      if (id === activeNodeId) {
        const parent = findParent(data, id);
        if (parent) parentId = parent.id;
      }
      ignoreFocusRef.current = true;
      const newTree = removeNode(data, id);
      onChange(newTree);
      if (parentId) {
        onSelectNode(parentId);
      } else if (activeNodeId) {
        // 非焦点删除，把 Monaco 光标送回当前焦点位置
        onSelectNode(activeNodeId);
      }
    },
    [data, onChange, activeNodeId, onSelectNode]
  );

  const handleAddConfirm = useCallback(
    (key: string, type: JsonNodeType) => {
      if (!pendingAddParentId) return;
      const newNode: JsonTreeNode = {
        id: genId(),
        key,
        value: type === 'null' ? null : '',
        type,
      };
      const newTree = addChild(data, pendingAddParentId, newNode);
      onChange(newTree);
      setPendingAddParentId(null);
      onSelectNode(newNode.id);
      pendingScrollRef.current = newNode.id;
    },
    [data, onChange, pendingAddParentId, onSelectNode]
  );

  const handleAddCancel = useCallback(() => {
    setPendingAddParentId(null);
  }, []);

  const handleRequestAddChild = useCallback((parentId: string) => {
    setPendingAddParentId(parentId);
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      {data.length === 0 ? (
        <div className={styles.empty}>打开一个 JSON 文件开始编辑</div>
      ) : dimensions.height > 0 ? (
        <Tree
          ref={treeRef}
          data={data}
          width={dimensions.width}
          height={dimensions.height}
          openByDefault={true}
          rowHeight={32}
          indent={20}
          padding={8}
          onFocus={(node: NodeApi<JsonTreeNode>) => {
            if (ignoreFocusRef.current) {
              ignoreFocusRef.current = false;
              return;
            }
            onSelectNode(node.id);
          }}
        >
          {(props: NodeRendererProps<JsonTreeNode>) => (
            <TreeNode
              {...props}
              activeNodeId={activeNodeId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onRequestAddChild={handleRequestAddChild}
              onSelectNode={onSelectNode}
            />
          )}
        </Tree>
      ) : null}
      <AddNodeDialog
        isOpen={pendingAddParentId !== null}
        onConfirm={handleAddConfirm}
        onCancel={handleAddCancel}
      />
    </div>
  );
}
