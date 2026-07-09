import { useState, useRef, useEffect, useCallback } from 'react';
import { Tree, NodeRendererProps, NodeApi, TreeApi } from 'react-arborist';
import { JsonTreeNode, JsonNodeType } from '../../types';
import { JsonSchema } from '../../hooks/useSchemaProcessor';
import { updateNode, removeNode, addChild, findParent, findNode } from '../../utils/treeUtils';
import {
  getArrayAddOptions,
  getPatternAddOptions,
  createTreeNodeFromSchema,
  createArrayItemNode,
  populateTreeFromSchema,
  mergeSchemaIntoTree,
  isTreeEmpty,
  hasMissingSchemaFields,
  treeStructureChanged,
} from '../../utils/schemaUtils';
import { TreeNode } from './TreeNode';
import { AddNodeDialog } from './AddNodeDialog';
import { AddPatternEntryDialog } from './AddPatternEntryDialog';
import { NodeMenuItem } from './NodeActionMenu';
import styles from './TreeEditor.module.css';

interface TreeEditorProps {
  data: JsonTreeNode[];
  onChange: (data: JsonTreeNode[]) => void;
  activeNodeId: string | null;
  onSelectNode: (id: string) => void;
  scrollTarget: { id: string; nonce: number } | null;
  restoreSignal: number;
  restoreTarget: string | null;
  schema?: JsonSchema | null;
}

let newIdCounter = 0;
function genId(): string {
  return `new_${Date.now()}_${++newIdCounter}`;
}

export function TreeEditor({
  data,
  onChange,
  activeNodeId,
  onSelectNode,
  scrollTarget,
  restoreSignal,
  restoreTarget,
  schema,
}: TreeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<TreeApi<JsonTreeNode> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pendingAddParentId, setPendingAddParentId] = useState<string | null>(null);
  const [pendingPatternAdd, setPendingPatternAdd] = useState<{
    parentId: string;
    pattern: string;
    valueSchema: JsonSchema;
  } | null>(null);
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

  const pendingRestoreRef = useRef<{ targetId: string | null } | null>(null);
  const prevRestoreSigRef = useRef(0);

  useEffect(() => {
    if (restoreSignal !== prevRestoreSigRef.current) {
      prevRestoreSigRef.current = restoreSignal;
      pendingRestoreRef.current = { targetId: restoreTarget };
    }
  }, [restoreSignal, restoreTarget]);

  useEffect(() => {
    if (pendingRestoreRef.current && data.length > 0) {
      const { targetId } = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      const nodeId = targetId ?? data[0].id;
      treeRef.current?.focus(nodeId, { scroll: true });
      onSelectNode(nodeId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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

  const focusNewNode = useCallback((nodeId: string) => {
    onSelectNode(nodeId);
    pendingScrollRef.current = nodeId;
  }, [onSelectNode]);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<JsonTreeNode>) => {
      const newTree = updateNode(data, id, node => ({ ...node, ...updates }));
      onChange(newTree);
    },
    [data, onChange]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      let shouldDelete = false;
      if (window.electronAPI) {
        const result = await window.electronAPI.showMessageBox({
          type: 'question',
          title: '删除节点',
          message: '确定要删除此节点吗？',
          buttons: ['确定', '取消'],
          cancelId: 1,
        });
        shouldDelete = result.response === 0;
      } else {
        shouldDelete = window.confirm('确定要删除此节点吗？');
      }
      if (!shouldDelete) return;
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
        value: type === 'null' ? null : type === 'boolean' ? false : type === 'number' ? 0 : '',
        type,
      };
      const newTree = addChild(data, pendingAddParentId, newNode);
      onChange(newTree);
      setPendingAddParentId(null);
      focusNewNode(newNode.id);
    },
    [data, onChange, pendingAddParentId, focusNewNode]
  );

  const handleAddCancel = useCallback(() => {
    setPendingAddParentId(null);
  }, []);

  const handleRequestAddChild = useCallback((parentId: string) => {
    setPendingAddParentId(parentId);
  }, []);

  const handleFillFromSchema = useCallback(() => {
    if (!schema) return;
    const newTree = populateTreeFromSchema(schema);
    onChange(newTree);
    if (newTree[0]) {
      focusNewNode(newTree[0].id);
    }
  }, [schema, onChange, focusNewNode]);

  const handleMergeSchema = useCallback(() => {
    if (!schema) return;
    const merged = mergeSchemaIntoTree(data, schema);
    if (treeStructureChanged(data, merged)) {
      onChange(merged);
    }
  }, [schema, data, onChange]);

  // 导入 Schema 后自动补全固定字段
  useEffect(() => {
    if (!schema || data.length === 0) return;
    const merged = mergeSchemaIntoTree(data, schema);
    if (treeStructureChanged(data, merged)) {
      onChange(merged);
    }
  // 仅在 schema 变化时触发，避免与编辑循环
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const handleAddArrayItem = useCallback(
    (parentId: string, itemSchema: JsonSchema) => {
      if (!schema) return;
      const newNode = createArrayItemNode(itemSchema, data, parentId, schema);
      if (!newNode) return;
      const newTree = addChild(data, parentId, newNode);
      onChange(newTree);
      focusNewNode(newNode.id);
    },
    [schema, data, onChange, focusNewNode]
  );

  const handleRequestPatternAdd = useCallback(
    (parentId: string, pattern: string, valueSchema: JsonSchema) => {
      setPendingPatternAdd({ parentId, pattern, valueSchema });
    },
    []
  );

  const handlePatternAddConfirm = useCallback(
    (key: string) => {
      if (!pendingPatternAdd || !schema) return;
      const { parentId, valueSchema } = pendingPatternAdd;
      const parent = findNode(data, parentId);
      if (parent?.children?.some(child => child.key === key)) {
        window.alert('该键名已存在');
        return;
      }
      const newNode = createTreeNodeFromSchema(key, valueSchema, schema);
      const newTree = addChild(data, parentId, newNode);
      onChange(newTree);
      setPendingPatternAdd(null);
      focusNewNode(newNode.id);
    },
    [pendingPatternAdd, schema, data, onChange, focusNewNode]
  );

  const handlePatternAddCancel = useCallback(() => {
    setPendingPatternAdd(null);
  }, []);

  const buildMenuItems = useCallback(
    (nodeData: JsonTreeNode, isRoot: boolean): NodeMenuItem[] => {
      const items: NodeMenuItem[] = [];
      const nodeId = nodeData.id;
      const isExpandable = nodeData.type === 'object' || nodeData.type === 'array';

      if (schema && isRoot && isTreeEmpty(data)) {
        items.push({
          id: 'fill-schema',
          label: '从 Schema 初始化',
          description: '自动生成全部固定字段',
          icon: 'fill',
          onClick: handleFillFromSchema,
        });
      }

      if (schema && nodeData.type === 'object' && hasMissingSchemaFields(data, schema, nodeId)) {
        items.push({
          id: 'merge-schema',
          label: '补全 Schema 字段',
          description: '自动添加缺失的固定字段',
          icon: 'fill',
          onClick: handleMergeSchema,
        });
      }

      if (schema && nodeData.type === 'array') {
        const arrayOptions = getArrayAddOptions(schema, data, nodeId);
        for (const opt of arrayOptions) {
          items.push({
            id: `add-array-${opt.id}`,
            label: opt.label,
            description: opt.description || opt.type,
            icon: opt.type,
            onClick: () => handleAddArrayItem(nodeId, opt.itemSchema),
          });
        }
      }

      if (schema && nodeData.type === 'object') {
        const patternOptions = getPatternAddOptions(schema, data, nodeId);
        for (const opt of patternOptions) {
          items.push({
            id: `add-pattern-${opt.pattern}`,
            label: opt.label,
            description: opt.description,
            icon: 'add',
            onClick: () => handleRequestPatternAdd(nodeId, opt.pattern, opt.valueSchema),
          });
        }
      }

      if (isExpandable && !schema) {
        items.push({
          id: 'add-child',
          label: '添加子节点',
          icon: 'add',
          onClick: () => handleRequestAddChild(nodeId),
        });
      }

      if (!isRoot) {
        items.push({
          id: 'delete',
          label: '删除节点',
          icon: 'delete',
          danger: true,
          onClick: () => { void handleDelete(nodeId); },
        });
      }

      return items;
    },
    [
      schema,
      data,
      handleFillFromSchema,
      handleMergeSchema,
      handleAddArrayItem,
      handleRequestPatternAdd,
      handleRequestAddChild,
      handleDelete,
    ]
  );

  const renderEmpty = () => {
    if (schema) {
      return (
        <div className={styles.empty}>
          <p>打开 JSON 文件，导入 Schema 后将自动补全固定字段</p>
          <button className={styles.emptyBtn} onClick={handleFillFromSchema}>
            从 Schema 初始化
          </button>
        </div>
      );
    }
    return <div className={styles.empty}>打开一个 JSON 文件开始编辑</div>;
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {data.length === 0 ? (
        renderEmpty()
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
              menuItems={buildMenuItems(props.node.data, props.node.level === 0)}
              onUpdate={handleUpdate}
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
      <AddPatternEntryDialog
        isOpen={pendingPatternAdd !== null}
        pattern={pendingPatternAdd?.pattern ?? '.*'}
        onConfirm={handlePatternAddConfirm}
        onCancel={handlePatternAddCancel}
      />
    </div>
  );
}
