import {
  FolderIcon,
  FileIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { RepoContent } from '@/types/github.types';
import { useState, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';

interface FileExplorerProps {
  contents: RepoContent[];
  currentPath: string;
  onFileClick: (path: string, type: 'file' | 'dir') => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: TreeNode[];
}

export const FileExplorer = ({
  contents,
  currentPath,
  onFileClick,
}: FileExplorerProps) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [treeStructure, setTreeStructure] = useState<TreeNode[]>([]);

  useEffect(() => {
    const tree = buildTree(contents);
    setTreeStructure(tree);

    if (currentPath) {
      const pathParts = currentPath.split('/');
      const newExpanded = new Set(expandedDirs);
      for (let i = 0; i < pathParts.length - 1; i++) {
        const partialPath = pathParts.slice(0, i + 1).join('/');
        newExpanded.add(partialPath);
      }
      setExpandedDirs(newExpanded);
    }
  }, [contents, currentPath]);

  const handleNodeClick = (node: TreeNode) => {
    if (node.type === 'dir') {
      toggleDir(node.path);
    }
    onFileClick(node.path, node.type);
  };

  const buildTree = (items: RepoContent[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const map = new Map<string, TreeNode>();

    items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });

    items.forEach((item) => {
      const paths = item.path.split('/');
      let currentPath = '';

      paths.reduce<TreeNode | null>((parent, part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!map.has(currentPath)) {
          const node: TreeNode = {
            name: part,
            path: currentPath,
            type: index === paths.length - 1 ? item.type : 'dir',
            children: [],
          };
          map.set(currentPath, node);

          if (parent) {
            parent.children.push(node);
          } else {
            root.push(node);
          }
        }

        return map.get(currentPath) || null;
      }, null);
    });

    return root;
  };

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isCurrentPath = currentPath === node.path;

    return (
      <div key={node.path} className="select-none">
        <div
          className={`flex items-center space-x-2 px-2 py-1 rounded-md cursor-pointer transition-colors ${
            isCurrentPath
              ? 'bg-purple-500/10 text-purple-400'
              : 'hover:bg-zinc-800/50 text-zinc-300'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            handleNodeClick(node);
          }}
        >
          <div className="flex items-center gap-2">
            {node.type === 'dir' && (
              <div className="w-4 h-4 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                )}
              </div>
            )}
            {node.type === 'dir' ? (
              <FolderIcon className="h-4 w-4 text-blue-400 shrink-0" />
            ) : (
              <FileIcon className="h-4 w-4 text-zinc-400 shrink-0" />
            )}
            <span className="text-sm truncate">{node.name}</span>
          </div>
        </div>
        {node.type === 'dir' && (
          <div
            className={`overflow-hidden transition-all duration-200 ${
              isExpanded ? 'max-h-screen' : 'max-h-0'
            }`}
          >
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 p-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300">Files</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {treeStructure.map((node) => renderNode(node))}
        </div>
      </ScrollArea>
    </div>
  );
};
