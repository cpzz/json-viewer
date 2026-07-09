import { useEffect, useRef, useState } from 'react';
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Braces,
  List,
  Type,
  Hash,
  ToggleLeft,
  CircleOff,
  FileJson,
  PenLine,
} from 'lucide-react';
import { JsonNodeType } from '../../types';
import styles from './NodeActionMenu.module.css';

export interface NodeMenuItem {
  id: string;
  label: string;
  description?: string;
  icon: 'add' | 'delete' | 'custom' | 'fill' | JsonNodeType;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface NodeActionMenuProps {
  items: NodeMenuItem[];
}

function MenuIcon({ icon }: { icon: NodeMenuItem['icon'] }) {
  const size = 14;
  switch (icon) {
    case 'add':
      return <Plus size={size} />;
    case 'delete':
      return <Trash2 size={size} />;
    case 'custom':
      return <PenLine size={size} />;
    case 'fill':
      return <FileJson size={size} />;
    case 'string':
      return <Type size={size} />;
    case 'number':
      return <Hash size={size} />;
    case 'boolean':
      return <ToggleLeft size={size} />;
    case 'null':
      return <CircleOff size={size} />;
    case 'object':
      return <Braces size={size} />;
    case 'array':
      return <List size={size} />;
    default:
      return <Plus size={size} />;
  }
}

export function NodeActionMenu({ items }: NodeActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className={styles.menuWrap} ref={containerRef}>
      <button
        className={styles.menuBtn}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        title="节点操作"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
          {items.map(item => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${item.danger ? styles.danger : ''}`}
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              <span className={styles.menuIcon}>
                <MenuIcon icon={item.icon} />
              </span>
              <span className={styles.menuText}>
                <span className={styles.menuLabel}>{item.label}</span>
                {item.description && (
                  <span className={styles.menuDesc}>{item.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
