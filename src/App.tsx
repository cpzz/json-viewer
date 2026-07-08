import { useState, useEffect, useCallback, useRef } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { SplitPane } from './components/SplitPane/SplitPane';
import { TreeEditor } from './components/TreeEditor/TreeEditor';
import { CodeEditor } from './components/CodeEditor/CodeEditor';
import { FileExplorer, FileItem } from './components/FileExplorer/FileExplorer';
import { SchemaForm, FormTheme } from './components/SchemaForm/SchemaForm';
import { SchemaPanel } from './components/SchemaPanel/SchemaPanel';
import { useJsonSync } from './hooks/useJsonSync';
import { useFileOperations } from './hooks/useFileOperations';
import { useSchemaProcessor } from './hooks/useSchemaProcessor';
import { findNodeIdByLine } from './utils/positionMap';
import { formToJsonTree } from './utils/schemaTransform';
import { StatusBar } from './components/StatusBar/StatusBar';
import styles from './App.module.css';

type Theme = 'dark' | 'light';

interface EditorPosState {
  cursorLine: number;
  activeNodeId: string | null;
}

function App() {
  const { jsonText, treeData, parseError, positionMap, updateFromTree, updateFromCode, isUpdatingFromTreeRef } = useJsonSync();
  const { saveFile, saveAs, reloadFile, registerBrowserFile, readBrowserFile, currentFilePath, setCurrentFilePath } = useFileOperations();
  const { schema, formData, validationErrors, loadSchema, updateFormData, generateJson } = useSchemaProcessor();
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');
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
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);
  const [schemaPanelVisible, setSchemaPanelVisible] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'tree' | 'form' | 'schema'>('tree');
  const [formTheme, setFormTheme] = useState<FormTheme>('antd');
  const editorStateRef = useRef<Map<string, EditorPosState>>(new Map());
  const lastCursorLineRef = useRef(1);
  const currentFilePathRef = useRef<string | null>(null);
  const browserPathCounterRef = useRef(0);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
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

    // 3. 格式化 JSON 为标准格式，确保行号与 positionMap 模拟一致
    //    先解析再 stringify，统一处理内联数组等非标格式
    let displayContent = content;
    try {
      const parsed = JSON.parse(content);
      displayContent = JSON.stringify(parsed, null, 2);
    } catch {
      // 解析失败则保持原内容
    }
    // 4. 同步更新 ref（不等 useEffect，防止 cursor event 用旧路径覆盖 map）
    currentFilePathRef.current = filePath;
    savedContentRef.current = displayContent;
    updateFromCode(displayContent, true);
    setCurrentFilePath(filePath);

    // 4. 从 map 恢复目标文件的位置
    const state = editorStateRef.current.get(filePath)!;
    setResetCursorLine(state.cursorLine);
    setResetCursorKey(k => k + 1);
    setTreeRestoreTarget(state.activeNodeId);
    setTreeRestoreSig(s => s + 1);
  }, [activeNodeId, updateFromCode, setCurrentFilePath]);

  const createBrowserPath = useCallback((name: string) => {
    browserPathCounterRef.current += 1;
    return `web-${Date.now()}-${browserPathCounterRef.current}/${name}`;
  }, []);

  const showMessage = useCallback(async (title: string, message: string, isError = false) => {
    if (window.electronAPI) {
      await window.electronAPI.showMessageBox({
        type: isError ? 'error' : 'info',
        title,
        message,
        buttons: ['确定'],
        cancelId: 0,
      });
      return;
    }
    window.alert(`${title}\n${message}`);
  }, []);

  const pickFilesFromInput = useCallback((multiple: boolean, directory = false) => {
    return new Promise<File[]>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.multiple = multiple;
      if (directory) {
        (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
      }
      input.onchange = () => resolve(Array.from(input.files || []));
      input.click();
    });
  }, []);

  const loadBrowserFiles = useCallback(async (files: Array<{ file: File; name?: string; handle?: FileSystemFileHandle }>) => {
    if (files.length === 0) return;

    const nextItems: FileItem[] = [];
    let firstLoaded: { path: string; content: string } | null = null;

    for (const entry of files) {
      const content = await entry.file.text();
      const displayName = entry.name || entry.file.name;
      const filePath = createBrowserPath(displayName);
      registerBrowserFile(filePath, content, entry.handle);
      nextItems.push({ path: filePath, name: displayName, type: 'file' });
      if (!firstLoaded) {
        firstLoaded = { path: filePath, content };
      }
    }

    setFileItems(prev => {
      const existing = new Set(prev.map(item => item.path));
      const toAdd = nextItems.filter(item => !existing.has(item.path));
      return [...prev, ...toAdd];
    });

    if (firstLoaded) {
      fileContentReady(firstLoaded.path, firstLoaded.content);
    }
  }, [createBrowserPath, registerBrowserFile, fileContentReady]);

  const handleOpen = async () => {
    if (isElectron) {
      const result = await window.electronAPI!.openFiles();
      if (result.filePaths.length > 0) {
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
        const firstPath = result.filePaths[0];
        const content = await window.electronAPI!.readFile(firstPath);
        fileContentReady(firstPath, content);
      }
      return;
    }

    const openPicker = (window as Window & {
      showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>;
    }).showOpenFilePicker;

    if (openPicker) {
      const handles = await openPicker({
        multiple: true,
        types: [{ description: 'JSON 文件', accept: { 'application/json': ['.json'] } }],
      });
      const files = await Promise.all(
        handles.map(async handle => ({ file: await handle.getFile(), handle }))
      );
      await loadBrowserFiles(files);
      return;
    }

    const files = await pickFilesFromInput(true, false);
    await loadBrowserFiles(files.map(file => ({ file })));
  };

  const handleNewFile = async () => {
    const emptyJson = '{}';
    if (isElectron) {
      const result = await window.electronAPI!.saveFile(emptyJson);
      if (!result.filePath) return;

      const newPath = result.filePath;
      setFileItems(prev => {
        if (prev.some(item => item.path === newPath)) return prev;
        return [
          ...prev,
          {
            path: newPath,
            name: newPath.split('\\').pop()?.split('/').pop() || newPath,
            type: 'file' as const,
          },
        ];
      });
      fileContentReady(newPath, emptyJson);
      return;
    }

    const savePicker = (window as Window & {
      showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
    }).showSaveFilePicker;

    if (savePicker) {
      const handle = await savePicker({
        suggestedName: 'untitled.json',
        types: [{ description: 'JSON 文件', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(emptyJson);
      await writable.close();

      const filePath = createBrowserPath(handle.name);
      registerBrowserFile(filePath, emptyJson, handle);
      setFileItems(prev => {
        if (prev.some(item => item.path === filePath)) return prev;
        return [...prev, { path: filePath, name: handle.name, type: 'file' }];
      });
      fileContentReady(filePath, emptyJson);
      return;
    }

    const filePath = createBrowserPath('untitled.json');
    registerBrowserFile(filePath, emptyJson);
    setFileItems(prev => [...prev, { path: filePath, name: 'untitled.json', type: 'file' }]);
    fileContentReady(filePath, emptyJson);
  };

  // 拖拽打开文件/目录
  useEffect(() => {
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      if (isElectron) {
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
          const results = await window.electronAPI!.statBatch(paths);
          setFileItems(prev => {
            const existing = new Set(prev.map(i => i.path));
            const toAdd = results.filter(i => !existing.has(i.path));
            return [...prev, ...toAdd];
          });
          if (results.length === 1 && results[0].type === 'file') {
            try {
              const content = await window.electronAPI!.readFile(results[0].path);
              fileContentReady(results[0].path, content);
            } catch {
              // 静默失败
            }
          }
        }
        return;
      }

      const droppedFiles = Array.from(e.dataTransfer?.files || []).filter(file =>
        file.name.toLowerCase().endsWith('.json')
      );

      if (droppedFiles.length > 0) {
        await loadBrowserFiles(
          droppedFiles.map(file => ({
            file,
            name: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
          }))
        );
      }
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [fileContentReady, isElectron, loadBrowserFiles]);

  const handleSave = async () => {
    let shouldSave = true;
    if (window.electronAPI) {
      const result = await window.electronAPI.showMessageBox({
        type: 'question',
        title: '保存文件',
        message: '是否保存当前文件？',
        buttons: ['确定', '取消'],
        cancelId: 1,
      });
      shouldSave = result.response === 0;
    } else {
      shouldSave = window.confirm('是否保存当前文件？');
    }
    if (!shouldSave) return;

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
      if (window.electronAPI) {
        const result = await window.electronAPI.showMessageBox({
          type: 'question',
          title: '未保存的更改',
          message: '当前文件有未保存的更改，刷新将丢失这些更改，是否继续？',
          buttons: ['丢弃并刷新', '取消'],
          cancelId: 1,
        });
        if (result.response !== 0) return;
      } else {
        const shouldDiscard = window.confirm('当前文件有未保存的更改，刷新将丢失这些更改，是否继续？');
        if (!shouldDiscard) return;
      }
    }
    try {
      const content = await reloadFile();
      savedContentRef.current = content;
      updateFromCode(content);
      setActiveNodeId(null);
      setJumpTarget(null);
    } catch (e) {
      await showMessage('刷新失败', `无法重新读取文件：\n${(e as Error).message}`, true);
    }
  };

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleCursorMove = useCallback((lineNumber: number, column: number) => {
    setCursorLine(lineNumber);
    setCursorColumn(column);
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
      const content = isElectron
        ? await window.electronAPI!.readFile(filePath)
        : await readBrowserFile(filePath);
      fileContentReady(filePath, content);
    } catch (e) {
      await showMessage('打开失败', `无法读取文件：\n${(e as Error).message}`, true);
    }
  }, [fileContentReady, isElectron, readBrowserFile, showMessage]);

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
    if (isElectron) {
      const result = await window.electronAPI!.openDirectory();
      if (result.filePaths.length > 0) {
        const items = await window.electronAPI!.statBatch(result.filePaths);
        setFileItems(prev => {
          const existing = new Set(prev.map(i => i.path));
          const toAdd = items.filter(i => !existing.has(i.path));
          return [...prev, ...toAdd];
        });
      }
      return;
    }

    const openDirectoryPicker = (window as Window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;

    if (openDirectoryPicker) {
      const dirHandle = await openDirectoryPicker();
      const fileEntries: Array<{ file: File; name: string; handle: FileSystemFileHandle }> = [];

      const walk = async (handle: FileSystemDirectoryHandle, prefix = '') => {
        for await (const [name, child] of (handle as any).entries() as AsyncIterable<[string, FileSystemHandle]>) {
          if (child.kind === 'directory') {
            await walk(child as FileSystemDirectoryHandle, `${prefix}${name}/`);
          } else if (name.toLowerCase().endsWith('.json')) {
            const fileHandle = child as FileSystemFileHandle;
            fileEntries.push({
              file: await fileHandle.getFile(),
              name: `${prefix}${name}`,
              handle: fileHandle,
            });
          }
        }
      };

      await walk(dirHandle);
      await loadBrowserFiles(fileEntries);
      return;
    }

    const files = await pickFilesFromInput(true, true);
    const jsonFiles = files
      .filter(file => file.name.toLowerCase().endsWith('.json'))
      .map(file => ({
        file,
        name: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      }));
    await loadBrowserFiles(jsonFiles);
  }, [isElectron, loadBrowserFiles, pickFilesFromInput]);

  // 导入 JSON Schema
  const handleImportSchema = useCallback(async () => {
    try {
      setImportError(null);

      if (isElectron) {
        const result = await window.electronAPI!.openFile();
        if (!result.filePath) return;

        const content = await window.electronAPI!.readFile(result.filePath);
        const loadResult = await loadSchema(content);

        if (!loadResult.success) {
          setImportError(loadResult.error || 'Schema 加载失败');
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const text = await file.text();
          const loadResult = await loadSchema(text);

          if (!loadResult.success) {
            setImportError(loadResult.error || 'Schema 加载失败');
          }
        };

        input.click();
      }
    } catch (error) {
      setImportError(`导入失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [isElectron, loadSchema]);

  // 当 formData 变化时，同步到 treeData
  useEffect(() => {
    if (schema && formData) {
      const newTreeData = formToJsonTree(formData, schema);
      updateFromTree(newTreeData);
    }
  }, [formData, schema, updateFromTree]);

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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpen();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
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
        onNewFile={handleNewFile}
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
        onImportSchema={handleImportSchema}
        hasSchema={!!schema}
      />

      {importError && (
        <div className={styles.errorBanner}>
          <span>{importError}</span>
          <button onClick={() => setImportError(null)}>×</button>
        </div>
      )}
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
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <button
                onClick={() => setLeftTab('tree')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: leftTab === 'tree' ? 'var(--bg-primary)' : 'transparent',
                  color: leftTab === 'tree' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: leftTab === 'tree' ? 600 : 400,
                  borderBottom: leftTab === 'tree' ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                树状编辑器
              </button>
              {schema && (
                <>
                  <button
                    onClick={() => setLeftTab('form')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: leftTab === 'form' ? 'var(--bg-primary)' : 'transparent',
                      color: leftTab === 'form' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: leftTab === 'form' ? 600 : 400,
                      borderBottom: leftTab === 'form' ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    表单编辑器
                  </button>
                  <button
                    onClick={() => setLeftTab('schema')}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: leftTab === 'schema' ? 'var(--bg-primary)' : 'transparent',
                      color: leftTab === 'schema' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: leftTab === 'schema' ? 600 : 400,
                      borderBottom: leftTab === 'schema' ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    JSON Schema
                  </button>
                </>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {leftTab === 'tree' ? (
                <TreeEditor
                  data={treeData}
                  onChange={updateFromTree}
                  activeNodeId={activeNodeId}
                  onSelectNode={handleSelectNode}
                  scrollTarget={scrollTarget}
                  restoreSignal={treeRestoreSig}
                  restoreTarget={treeRestoreTarget}
                />
              ) : leftTab === 'form' ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {schema ? (
                    <>
                      <div style={{
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          表单主题：
                        </label>
                        <select
                          value={formTheme}
                          onChange={(e) => setFormTheme(e.target.value as FormTheme)}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="antd">Ant Design</option>
                          <option value="mui">Material UI</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        <SchemaForm
                          schema={schema}
                          formData={formData}
                          onChange={updateFormData}
                          theme={formTheme}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
                      请先导入 JSON Schema 文件
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: '100%', overflow: 'hidden' }}>
                  {schema ? (
                    <CodeEditor
                      value={JSON.stringify(schema, null, 2)}
                      onChange={() => {}}
                      error={null}
                      theme={theme}
                      positionMap={[]}
                      jumpTarget={null}
                      onCursorMove={() => {}}
                      resetCursorKey={0}
                      resetCursorLine={1}
                      isUpdatingFromTreeRef={{ current: false }}
                      readOnly={true}
                    />
                  ) : (
                    <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
                      请先导入 JSON Schema 文件
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
      <StatusBar
        currentFilePath={currentFilePath}
        cursorLine={cursorLine}
        cursorColumn={cursorColumn}
        parseError={parseError}
        nodeCount={treeData.length}
        theme={theme}
      />
    </div>
  );
}

export default App;
