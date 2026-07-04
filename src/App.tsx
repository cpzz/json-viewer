import { useState, useEffect, useCallback, useRef } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { SplitPane } from './components/SplitPane/SplitPane';
import { TreeEditor } from './components/TreeEditor/TreeEditor';
import { CodeEditor } from './components/CodeEditor/CodeEditor';
import { FileExplorer, FileItem } from './components/FileExplorer/FileExplorer';
import { useJsonSync } from './hooks/useJsonSync';
import { useFileOperations } from './hooks/useFileOperations';
import { findNodeIdByLine } from './utils/positionMap';
import styles from './App.module.css';

type Theme = 'dark' | 'light';

interface EditorPosState {
  cursorLine: number;
  activeNodeId: string | null;
}

function App() {
  const { jsonText, treeData, parseError, positionMap, updateFromTree, updateFromCode, isUpdatingFromTreeRef } = useJsonSync();
  const { saveFile, saveAs, reloadFile, currentFilePath, setCurrentFilePath } = useFileOperations();
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<{ id: string; nonce: number } | null>(null);
  const [, forceUpdate] = useState(0);
  const savedContentRef = useRef<string>('');
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [explorerWidth, setExplorerWidth] = useState(250);
  const [isExplorerDragging, setIsExplorerDragging] = useState(false);
  const [resetCursorKey, setResetCursorKey] = useState(0);
  const [resetCursorLine, setResetCursorLine] = useState(1);
  const [treeRestoreSig, setTreeRestoreSig] = useState(0);
  const [treeRestoreTarget, setTreeRestoreTarget] = useState<string | null>(null);
  const editorStateRef = useRef<Map<string, EditorPosState>>(new Map());
  const lastCursorLineRef = useRef(1);
  const currentFilePathRef = useRef<string | null>(null);
  const isDirty = jsonText !== savedContentRef.current;
  const canSave = isDirty;
  const canRefresh = currentFilePath !== null && isDirty;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // 同步 currentFilePath 到 ref
  useEffect(() => {
    currentFilePathRef.current = currentFilePath;
  }, [currentFilePath]);

  useEffect(() => {
    const name = currentFilePath
      ? currentFilePath.split('\\').pop()?.split('/').pop()
      : null;
    document.title = name ? `JSON 编辑器 - ${name}` : 'JSON 编辑器';
  }, [currentFilePath]);

  // 统一的文件加载处理：切换文件时保存旧状态、加载新内容、恢复新文件状态
  const fileContentReady = useCallback((filePath: string, content: string) => {
    // 1. 保存当前文件状态到 map
    const oldPath = currentFilePathRef.current;
    if (oldPath && editorStateRef.current.has(oldPath)) {
      const curState = editorStateRef.current.get(oldPath)!;
      curState.cursorLine = lastCursorLineRef.current;
      curState.activeNodeId = activeNodeId;
    }
    // 2. 确保目标文件有 map 条目（默认第一行/第一节点）
    if (!editorStateRef.current.has(filePath)) {
      editorStateRef.current.set(filePath, { cursorLine: 1, activeNodeId: null });
    }

    // 3. 同步更新 ref（不等 useEffect，防止 cursor event 用旧路径覆盖 map）
    currentFilePathRef.current = filePath;
    savedContentRef.current = content;
    updateFromCode(content, true);  // true = 即时解析，不等 300ms 防抖
    setCurrentFilePath(filePath);

    // 4. 从 map 恢复目标文件的位置
    const state = editorStateRef.current.get(filePath)!;
    setResetCursorLine(state.cursorLine);
    setResetCursorKey(k => k + 1);
    setTreeRestoreTarget(state.activeNodeId);
    setTreeRestoreSig(s => s + 1);
  }, [activeNodeId, updateFromCode, setCurrentFilePath]);

  const handleOpen = async () => {
    const result = await window.electronAPI.openFiles();
    if (result.filePaths.length > 0) {
      // 将选中的文件加入文件列表
      setFileItems(prev => {
        const existing = new Set(prev.map(i => i.path));
        const toAdd = result.filePaths
          .filter(p => !existing.has(p))
          .map(p => ({
            path: p,
            name: p.split('\\').pop()?.split('/').pop() || p,
            type: 'file' as const,
          }));
        return [...prev, ...toAdd];
      });
      // 加载第一个文件
      const firstPath = result.filePaths[0];
      const content = await window.electronAPI.readFile(firstPath);
      fileContentReady(firstPath, content);
    }
  };

  // 拖拽打开文件/目录
  useEffect(() => {
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      const paths: string[] = [];
      if (e.dataTransfer?.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i];
          if ((file as any).path) {
            paths.push((file as any).path);
          }
        }
      }
      if (paths.length > 0) {
        const results = await window.electronAPI.statBatch(paths);
        setFileItems(prev => {
          const existing = new Set(prev.map(i => i.path));
          const toAdd = results.filter(i => !existing.has(i.path));
          return [...prev, ...toAdd];
        });
        // 如果是单个文件，自动打开
        if (results.length === 1 && results[0].type === 'file') {
          try {
            const content = await window.electronAPI.readFile(results[0].path);
            fileContentReady(results[0].path, content);
          } catch {
            // 静默失败
          }
        }
      }
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [fileContentReady]);

  const handleSave = async () => {
    const result = await window.electronAPI.showMessageBox({
      type: 'question',
      title: '保存文件',
      message: '是否保存当前文件？',
      buttons: ['确定', '取消'],
      cancelId: 1,
    });
    if (result.response !== 0) return;
    let success = false;
    if (currentFilePath) {
      success = await saveFile(jsonText);
    } else {
      success = await saveAs(jsonText);
    }
    if (success) {
      savedContentRef.current = jsonText;
      forceUpdate(v => v + 1);
    }
  };

  const handleRefresh = async () => {
    if (isDirty) {
      const result = await window.electronAPI.showMessageBox({
        type: 'question',
        title: '未保存的更改',
        message: '当前文件有未保存的更改，是否保存后再刷新？',
        buttons: ['保存', '不保存', '取消'],
        cancelId: 2,
      });
      if (result.response === 2) return;
      if (result.response === 0) {
        const saved = await saveFile(jsonText);
        if (saved) savedContentRef.current = jsonText;
        else return;
      }
    }
    try {
      const content = await reloadFile();
      savedContentRef.current = content;
      updateFromCode(content);
      setActiveNodeId(null);
      setJumpTarget(null);
    } catch (e) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: '刷新失败',
        message: `无法重新读取文件：\n${(e as Error).message}`,
        buttons: ['确定'],
        cancelId: 0,
      });
    }
  };

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleCursorMove = useCallback((lineNumber: number) => {
    lastCursorLineRef.current = lineNumber;
    const nodeId = findNodeIdByLine(positionMap, lineNumber);
    if (nodeId) {
      setActiveNodeId(nodeId);
      setScrollTarget({ id: nodeId, nonce: Date.now() });
      // 保存到 editorStateMap
      const path = currentFilePathRef.current;
      if (path) {
        editorStateRef.current.set(path, { cursorLine: lineNumber, activeNodeId: nodeId });
      }
    }
  }, [positionMap]);

  const handleSelectNode = useCallback((id: string) => {
    setActiveNodeId(id);
    setJumpTarget(id);
    // 保存到 editorStateMap
    const path = currentFilePathRef.current;
    if (path) {
      editorStateRef.current.set(path, { cursorLine: lastCursorLineRef.current, activeNodeId: id });
    }
  }, []);

  // 文件列表：从文件管理器打开文件
  const handleOpenFileFromExplorer = useCallback(async (filePath: string) => {
    try {
      const content = await window.electronAPI.readFile(filePath);
      fileContentReady(filePath, content);
    } catch (e) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: '打开失败',
        message: `无法读取文件：\n${(e as Error).message}`,
        buttons: ['确定'],
        cancelId: 0,
      });
    }
  }, [fileContentReady]);

  // 文件列表：从列表移除
  const handleRemoveFileItem = useCallback((path: string) => {
    // 清除 editorStateMap 中的记录
    editorStateRef.current.delete(path);
    if (path === currentFilePath) {
      savedContentRef.current = '';
      updateFromCode('');
      setActiveNodeId(null);
      setJumpTarget(null);
      setCurrentFilePath(null);
    }
    setFileItems(prev => prev.filter(i => i.path !== path));
  }, [currentFilePath, updateFromCode, setCurrentFilePath]);

  // 打开目录
  const handleOpenDirectory = useCallback(async () => {
    const result = await window.electronAPI.openDirectory();
    if (result.filePaths.length > 0) {
      const items = await window.electronAPI.statBatch(result.filePaths);
      setFileItems(prev => {
        const existing = new Set(prev.map(i => i.path));
        const toAdd = items.filter(i => !existing.has(i.path));
        return [...prev, ...toAdd];
      });
    }
  }, []);

  // 文件列表分隔条拖拽
  const handleExplorerResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsExplorerDragging(true);
  }, []);

  useEffect(() => {
    if (!isExplorerDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setExplorerWidth(Math.max(150, Math.min(500, e.clientX)));
    };
    const handleMouseUp = () => setIsExplorerDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isExplorerDragging]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpen();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.app}>
      <Toolbar
        onOpen={handleOpen}
        onSave={handleSave}
        onRefresh={handleRefresh}
        canRefresh={canRefresh}
        canSave={canSave}
        leftVisible={leftVisible}
        rightVisible={rightVisible}
        onToggleLeft={() => setLeftVisible(v => !v)}
        onToggleRight={() => setRightVisible(v => !v)}
        explorerVisible={explorerVisible}
        onToggleExplorer={() => setExplorerVisible(v => !v)}
        currentFilePath={currentFilePath}
        parseError={parseError}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenDirectory={handleOpenDirectory}
      />
      <div className={styles.main}>
        {explorerVisible && (
          <div className={styles.explorerPanel} style={{ width: explorerWidth }}>
            <FileExplorer
              items={fileItems}
              onOpenFile={handleOpenFileFromExplorer}
              onRemoveItem={handleRemoveFileItem}
            />
          </div>
        )}
        {explorerVisible && (
          <div
            className={`${styles.explorerDivider} ${isExplorerDragging ? styles.explorerDragging : ''}`}
            onMouseDown={handleExplorerResizeStart}
          >
            <div className={styles.explorerDividerLine} />
          </div>
        )}
        <SplitPane leftVisible={leftVisible} rightVisible={rightVisible}>
          <TreeEditor
            data={treeData}
            onChange={updateFromTree}
            activeNodeId={activeNodeId}
            onSelectNode={handleSelectNode}
            scrollTarget={scrollTarget}
            restoreSignal={treeRestoreSig}
            restoreTarget={treeRestoreTarget}
          />
          <CodeEditor
            value={jsonText}
            onChange={updateFromCode}
            error={parseError}
            theme={theme}
            positionMap={positionMap}
            jumpTarget={jumpTarget}
            onCursorMove={handleCursorMove}
            resetCursorKey={resetCursorKey}
            resetCursorLine={resetCursorLine}
            isUpdatingFromTreeRef={isUpdatingFromTreeRef}
          />
        </SplitPane>
      </div>
    </div>
  );
}

export default App;
