import { NodeRendererProps } from 'react-arborist';
import { JsonTreeNode } from '../../types';
import styles from './TreeEditor.module.css';

export function TreeNode({ node, style, dragHandle }: NodeRendererProps<JsonTreeNode>) {
  const data = node.data;
  const indent = node.level * 20 + 8;

  const getTypeColor = (): string => {
    switch (data.type) {
      case 'string':
        return '#ce9178';
      case 'number':
        return '#b5cea8';
      case 'boolean':
        return '#569cd6';
      case 'null':
        return '#569cd6';
      case 'object':
      case 'array':
        return '#d4d4d4';
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

  return (
    <div
      className={`${styles.nodeRow} ${node.isSelected ? styles.selected : ''}`}
      style={{ ...style, paddingLeft: indent }}
      ref={dragHandle}
      onClick={() => node.select()}
      onDoubleClick={() => {
        if (isExpandable) {
          node.toggle();
        }
      }}
    >
      {isExpandable && (
        <button
          className={styles.expandBtn}
          onClick={(e) => {
            e.stopPropagation();
            node.toggle();
          }}
        >
          <span className={`${styles.arrow} ${node.isOpen ? styles.open : ''}`}>&#9654;</span>
        </button>
      )}
      {!isExpandable && <span className={styles.expandPlaceholder} />}
      <span className={styles.key}>{data.key}:</span>
      <span className={styles.value} style={{ color: getTypeColor() }}>
        {getValuePreview()}
      </span>
    </div>
  );
}
