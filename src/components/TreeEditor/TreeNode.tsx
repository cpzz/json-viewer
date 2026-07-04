import { useState, useRef, useEffect } from 'react';
import { NodeRendererProps } from 'react-arborist';
import { JsonTreeNode } from '../../types';
import styles from './TreeEditor.module.css';

interface TreeNodeProps extends NodeRendererProps<JsonTreeNode> {
  activeNodeId: string | null;
  onUpdate: (id: string, updates: Partial<JsonTreeNode>) => void;
  onDelete: (id: string) => void;
  onRequestAddChild: (parentId: string) => void;
  onSelectNode: (id: string) => void;
}

export function TreeNode({ node, style, dragHandle, activeNodeId, onUpdate, onDelete, onRequestAddChild, onSelectNode }: TreeNodeProps) {
  const data = node.data;
  const indent = node.level * 20 + 8;
  const [editing, setEditing] = useState<'key' | 'value' | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const getTypeColor = (): string => {
    switch (data.type) {
      case 'string': return 'var(--string-color)';
      case 'number': return 'var(--number-color)';
      case 'boolean': return 'var(--boolean-color)';
      case 'null': return 'var(--boolean-color)';
      default: return 'var(--text-primary)';
    }
  };

  const getValuePreview = (): string => {
    if (data.type === 'object') return `{${data.children?.length || 0} 项}`;
    if (data.type === 'array') return `[${data.children?.length || 0} 项]`;
    if (data.type === 'null') return 'null';
    if (data.type === 'string') return `"${String(data.value).substring(0, 40)}"`;
    return String(data.value);
  };

  const isExpandable = data.type === 'object' || data.type === 'array';
  const isLeaf = !isExpandable;
  const isRoot = node.level === 0;
  const isActive = data.id === activeNodeId;

  const startEditValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLeaf) {
      setEditValue(data.type === 'null' ? '' : String(data.value));
      setEditing('value');
    }
  };

  const startEditKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRoot) {
      setEditValue(data.key);
      setEditing('key');
    }
  };

  const commitEdit = () => {
    if (editing === 'value') {
      let newValue: unknown = editValue;
      if (data.type === 'number') {
        newValue = Number(editValue);
        if (isNaN(newValue as number)) newValue = 0;
      } else if (data.type === 'boolean') {
        newValue = editValue === 'true';
      } else if (data.type === 'null') {
        newValue = null;
      }
      onUpdate(data.id, { value: newValue });
    } else if (editing === 'key') {
      if (editValue.trim()) {
        onUpdate(data.id, { key: editValue });
      }
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div
      data-node-id={data.id}
      className={`${styles.nodeRow} ${isActive ? styles.active : ''}`}
      style={{ ...style, paddingLeft: indent }}
      ref={dragHandle}
      onClick={() => {
        onSelectNode(data.id);
      }}
    >
      {isExpandable && (
        <button
          className={styles.expandBtn}
          onClick={(e) => { e.stopPropagation(); node.toggle(); }}
        >
          <span className={`${styles.arrow} ${node.isOpen ? styles.open : ''}`}>&#9654;</span>
        </button>
      )}
      {!isExpandable && <span className={styles.expandPlaceholder} />}

      {editing === 'key' ? (
        <input
          ref={inputRef}
          className={styles.editInput}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={styles.key} onDoubleClick={startEditKey}>
          {data.key}:
        </span>
      )}

      {editing === 'value' ? (
        <input
          ref={inputRef}
          className={styles.editInput}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={styles.value}
          style={{ color: getTypeColor() }}
          onDoubleClick={startEditValue}
        >
          {getValuePreview()}
        </span>
      )}

      <div className={styles.actions}>
        <span className={styles.typeBadge}>{data.type}</span>
        {isExpandable && (
          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); onRequestAddChild(data.id); }}
            title="添加子节点"
          >
            +
          </button>
        )}
        {!isRoot && (
          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
            title="删除节点"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
