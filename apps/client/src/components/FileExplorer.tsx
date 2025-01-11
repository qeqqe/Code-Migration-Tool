import { FolderIcon, FileIcon, ChevronRightIcon } from 'lucide-react';
import { RepoContent } from '@/types/github.types';

interface FileExplorerProps {
  contents: RepoContent[];
  currentPath: string;
  onFileClick: (path: string, type: 'file' | 'dir') => void;
}

export const FileExplorer = ({
  contents,
  currentPath,
  onFileClick,
}: FileExplorerProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300">Files</h3>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-0.5">
          {contents.map((item) => (
            <div
              key={item.path}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                currentPath === item.path
                  ? 'bg-purple-500/10 text-purple-400'
                  : 'text-zinc-300 hover:bg-zinc-800/50'
              }`}
              onClick={() => onFileClick(item.path, item.type)}
            >
              {item.type === 'dir' ? (
                <>
                  <FolderIcon className="h-4 w-4 text-blue-400 shrink-0" />
                  <ChevronRightIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                </>
              ) : (
                <FileIcon className="h-4 w-4 text-zinc-400 shrink-0" />
              )}
              <span className="text-sm truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
