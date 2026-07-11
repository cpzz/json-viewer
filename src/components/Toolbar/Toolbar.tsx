import { FilePlus, FolderOpen, Save, RefreshCw, PanelLeft, PanelRight, Sun, Moon, FolderTree, FolderPlus, FileJson } from 'lucide-react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onNewFile: () => void;
  onOpen: () => void;
  onOpenDirectory: () => void;
  onSave: () => void;
  onRefresh: () => void;
  canRefresh: boolean;
  canSave: boolean;
  leftVisible: boolean;
  rightVisible: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  explorerVisible: boolean;
  onToggleExplorer: () => void;
  currentFilePath?: string | null;
  parseError?: string | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onImportSchema?: () => void;
  hasSchema?: boolean;
}

export function Toolbar({
  onNewFile,
  onOpen,
  onOpenDirectory,
  onSave,
  onRefresh,
  canRefresh,
  canSave,
  leftVisible,
  rightVisible,
  onToggleLeft,
  onToggleRight,
  explorerVisible,
  onToggleExplorer,
  currentFilePath,
  parseError,
  theme,
  onToggleTheme,
  onImportSchema,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.leftGroup}>
        <button className={styles.iconBtn} onClick={onNewFile} title="新建">
          <FilePlus size={18} />
        </button>
        <button className={styles.iconBtn} onClick={onOpen} title="打开">
          <FolderOpen size={18} />
        </button>
        <button className={styles.iconBtn} onClick={onOpenDirectory} title="打开目录">
          <FolderPlus size={18} />
        </button>
        {onImportSchema && (
          <button className={styles.iconBtn} onClick={onImportSchema} title="导入 Schema">
            <FileJson size={18} />
          </button>
        )}
        <button className={styles.iconBtn} onClick={onSave} disabled={!canSave} title="保存">
          <Save size={18} />
        </button>
        <button className={styles.iconBtn} onClick={onRefresh} disabled={!canRefresh} title="刷新">
          <RefreshCw size={18} />
        </button>
        <div className={styles.divider} />
        <button
          className={`${styles.iconBtn} ${explorerVisible ? styles.active : ''}`}
          onClick={onToggleExplorer}
          title={explorerVisible ? '隐藏文件列表' : '显示文件列表'}
        >
          <FolderTree size={18} />
        </button>
        <button
          className={`${styles.iconBtn} ${leftVisible ? styles.active : ''}`}
          onClick={onToggleLeft}
          title={leftVisible ? '隐藏树状编辑器' : '显示树状编辑器'}
        >
          <PanelLeft size={18} />
        </button>
        <button
          className={`${styles.iconBtn} ${rightVisible ? styles.active : ''}`}
          onClick={onToggleRight}
          title={rightVisible ? '隐藏代码编辑器' : '显示代码编辑器'}
        >
          <PanelRight size={18} />
        </button>
      </div>
      <div className={styles.centerGroup}>
        {currentFilePath && (
          <span className={styles.filePath} title={currentFilePath}>
            {currentFilePath.split('\\').pop()?.split('/').pop()}
          </span>
        )}
      </div>
      <div className={styles.rightGroup}>
        {parseError && (
          <span className={styles.error} title={parseError}>
            JSON 解析错误
          </span>
        )}
        <button
          className={styles.iconBtn}
          onClick={onToggleTheme}
          title={theme === 'dark' ? '日间模式' : '夜间模式'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
}
