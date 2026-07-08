import { useState, useCallback, useRef } from 'react';

export function useFileOperations() {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const browserContentsRef = useRef<Map<string, string>>(new Map());
  const browserHandlesRef = useRef<Map<string, FileSystemFileHandle>>(new Map());

  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const registerBrowserFile = useCallback((filePath: string, content: string, handle?: FileSystemFileHandle) => {
    browserContentsRef.current.set(filePath, content);
    if (handle) {
      browserHandlesRef.current.set(filePath, handle);
    }
  }, []);

  const readBrowserFile = useCallback(async (filePath: string): Promise<string> => {
    const handle = browserHandlesRef.current.get(filePath);
    if (handle) {
      const file = await handle.getFile();
      const content = await file.text();
      browserContentsRef.current.set(filePath, content);
      return content;
    }
    if (browserContentsRef.current.has(filePath)) {
      return browserContentsRef.current.get(filePath)!;
    }
    throw new Error('浏览器模式下无法读取该文件');
  }, []);

  const downloadFile = useCallback((filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const openFile = useCallback(async (): Promise<{ content: string; filePath: string | null }> => {
    if (hasElectron) {
      const result = await window.electronAPI!.openFile();
      if (result.filePath) {
        const content = await window.electronAPI!.readFile(result.filePath);
        setCurrentFilePath(result.filePath);
        return { content, filePath: result.filePath };
      }
      return { content: '', filePath: null };
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    const file = await new Promise<File | null>(resolve => {
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });

    if (file) {
      const content = await file.text();
      const filePath = `web-${Date.now()}/${file.name}`;
      browserContentsRef.current.set(filePath, content);
      setCurrentFilePath(filePath);
      return { content, filePath };
    }
    return { content: '', filePath: null };
  }, [hasElectron]);

  const saveFile = useCallback(
    async (content: string): Promise<boolean> => {
      if (!hasElectron) {
        const filePath = currentFilePath;
        if (filePath) {
          const handle = browserHandlesRef.current.get(filePath);
          if (handle) {
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            browserContentsRef.current.set(filePath, content);
            return true;
          }
          browserContentsRef.current.set(filePath, content);
          const filename = filePath.split('/').pop() || 'untitled.json';
          downloadFile(filename, content);
          return true;
        }
        downloadFile('untitled.json', content);
        return true;
      }

      let filePath = currentFilePath;
      if (!filePath) {
        const result = await window.electronAPI!.saveFile(content);
        filePath = result.filePath;
      } else {
        await window.electronAPI!.writeFile(filePath, content);
      }
      if (filePath) {
        setCurrentFilePath(filePath);
        return true;
      }
      return false;
    },
    [currentFilePath, hasElectron, downloadFile]
  );

  const saveAs = useCallback(async (content: string): Promise<boolean> => {
    if (!hasElectron) {
      const picker = (window as any).showSaveFilePicker as
        | ((options?: unknown) => Promise<FileSystemFileHandle>)
        | undefined;

      if (picker) {
        const handle = await picker({
          suggestedName: 'untitled.json',
          types: [{ description: 'JSON 文件', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        const filePath = `web-${Date.now()}/${handle.name}`;
        browserHandlesRef.current.set(filePath, handle);
        browserContentsRef.current.set(filePath, content);
        setCurrentFilePath(filePath);
        return true;
      }

      downloadFile('untitled.json', content);
      return true;
    }

    const result = await window.electronAPI!.saveFile(content);
    if (result.filePath) {
      setCurrentFilePath(result.filePath);
      return true;
    }
    return false;
  }, [hasElectron, downloadFile]);

  const reloadFile = useCallback(async (): Promise<string> => {
    if (!currentFilePath) throw new Error('没有已打开的文件');

    if (!hasElectron) {
      return readBrowserFile(currentFilePath);
    }

    const content = await window.electronAPI!.readFile(currentFilePath);
    return content;
  }, [currentFilePath, hasElectron, readBrowserFile]);

  return {
    openFile,
    saveFile,
    saveAs,
    reloadFile,
    registerBrowserFile,
    readBrowserFile,
    currentFilePath,
    setCurrentFilePath,
  };
}
