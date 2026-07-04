import { FolderOpen, Save, RefreshCw, PanelLeft, PanelRight, Sun, Moon } from 'lucide-react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onOpen: () => void;
  onSave: () => void;
  onRefresh: () => void;
  canRefresh: boolean;
  canSave: boolean;
  leftVisible: boolean;
  rightVisible: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  currentFilePath?: string | null;
  parseError?: string | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function Toolbar({
  onOpen,
  onSave,
  onRefresh,
  canRefresh,
  canSave,
  leftVisible,
  rightVisible,
  onToggleLeft,
  onToggleRight,
  currentFilePath,
  parseError,
  theme,
  onToggleTheme,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.leftGroup}>
        <button className={styles.iconBtn} onClick={onOpen} title="打开文件 (Ctrl+O)">
          <FolderOpen size={18} />
          <span className={styles.tooltip}>打开</span>
        </button>
        <button className={styles.iconBtn} onClick={onSave} title="保存文件 (Ctrl+S)" disabled={!canSave}>
          <Save size={18} />
          <span className={styles.tooltip}>保存</span>
        </button>
        <button className={styles.iconBtn} onClick={onRefresh} title="刷新" disabled={!canRefresh}>
          <RefreshCw size={18} />
          <span className={styles.tooltip}>刷新</span>
        </button>
        <div className={styles.divider} />
        <button
          className={`${styles.iconBtn} ${leftVisible ? styles.active : ''}`}
          onClick={onToggleLeft}
          title={leftVisible ? '隐藏左侧面板' : '显示左侧面板'}
        >
          <PanelLeft size={18} />
          <span className={styles.tooltip}>{leftVisible ? '隐藏左侧' : '显示左侧'}</span>
        </button>
        <button
          className={`${styles.iconBtn} ${rightVisible ? styles.active : ''}`}
          onClick={onToggleRight}
          title={rightVisible ? '隐藏右侧面板' : '显示右侧面板'}
        >
          <PanelRight size={18} />
          <span className={styles.tooltip}>{rightVisible ? '隐藏右侧' : '显示右侧'}</span>
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
          title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className={styles.tooltip}>{theme === 'dark' ? '日间模式' : '夜间模式'}</span>
        </button>
      </div>
    </div>
  );
}
