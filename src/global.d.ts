interface ElectronAPI {
  openFile: () => Promise<{ filePath: string | null }>;
  saveFile: (content: string) => Promise<{ filePath: string | null }>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  showMessageBox: (options: {
    type: string;
    title: string;
    message: string;
    buttons: string[];
    cancelId: number;
  }) => Promise<{ response: number }>;
  onFileDrop: (callback: (filePath: string) => void) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
