import { useState, useCallback } from 'react';
import styles from './FileExplorer.module.css';

export interface FileItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
}

interface FileExplorerProps {
  items: FileItem[];
  onOpenFile: (filePath: string) => void;
  onRemoveItem: (path: string) => void;
}

export function FileExplorer({ items, onOpenFile, onRemoveItem }: FileExplorerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>文件</span>
      </div>
      <div className={styles.list}>
        {items.length === 0 && (
          <div className={styles.empty}>拖拽文件到此处</div>
        )}
        {items.map(item => (
          <FileTreeItem
            key={item.path}
            item={item}
            onOpenFile={onOpenFile}
            onRemoveItem={onRemoveItem}
          />
        ))}
      </div>
    </div>
  );
}

function FileTreeItem({ item, onOpenFile, onRemoveItem }: {
  item: FileItem;
  onOpenFile: (path: string) => void;
  onRemoveItem: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDoubleClick = useCallback(async () => {
    if (item.type === 'directory') {
      if (!expanded && children === null) {
        setLoading(true);
        try {
          if (window.electronAPI) {
            const entries = await window.electronAPI.readDirectory(item.path);
            setChildren(entries);
          } else {
            setChildren([]);
          }
        } catch {
          setChildren([]);
        }
        setLoading(false);
      }
      setExpanded(v => !v);
    } else {
      onOpenFile(item.path);
    }
  }, [item, expanded, children, onOpenFile]);

  const handleClick = useCallback(() => {
    if (item.type === 'file') {
      onOpenFile(item.path);
    }
  }, [item, onOpenFile]);

  return (
    <div>
      <div
        className={styles.item}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      >
        <span className={styles.icon}>
          {item.type === 'directory' ? (
            <span className={`${styles.arrow} ${expanded ? styles.arrowOpen : ''}`}>&#9654;</span>
          ) : (
            <span className={styles.fileIcon}>&#128196;</span>
          )}
        </span>
        <span className={styles.name}>{item.name}</span>
        <button
          className={styles.removeBtn}
          onClick={(e) => { e.stopPropagation(); onRemoveItem(item.path); }}
          title="从列表中移除"
        >
          &times;
        </button>
      </div>
      {item.type === 'directory' && expanded && (
        <div className={styles.children}>
          {loading ? (
            <div className={styles.loading}>加载中...</div>
          ) : children && children.length > 0 ? (
            children.map(child => (
              <FileTreeItem
                key={child.path}
                item={child}
                onOpenFile={onOpenFile}
                onRemoveItem={onRemoveItem}
              />
            ))
          ) : (
            <div className={styles.empty}>空目录</div>
          )}
        </div>
      )}
    </div>
  );
}
