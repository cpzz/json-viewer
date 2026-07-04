import styles from './StatusBar.module.css';

interface StatusBarProps {
  currentFilePath: string | null;
  cursorLine: number;
  cursorColumn: number;
  parseError: string | null;
  nodeCount: number;
  theme: 'dark' | 'light';
}

export function StatusBar({ currentFilePath, cursorLine, cursorColumn, parseError, nodeCount, theme }: StatusBarProps) {
  const fileName = currentFilePath
    ? currentFilePath.split('\\').pop()?.split('/').pop()
    : null;

  return (
    <div className={styles.statusBar} data-theme={theme}>
      <div className={styles.left}>
        {parseError ? (
          <span className={styles.error}>&#9888; 解析错误</span>
        ) : fileName ? (
          <span className={styles.fileName}>{fileName}</span>
        ) : (
          <span className={styles.muted}>未打开文件</span>
        )}
      </div>
      <div className={styles.right}>
        {nodeCount > 0 && <span className={styles.item}>{nodeCount} 个节点</span>}
        {fileName && (
          <>
            <span className={styles.separator}>|</span>
            <span className={styles.item}>行 {cursorLine}, 列 {cursorColumn}</span>
          </>
        )}
      </div>
    </div>
  );
}
