'use client';

import { useParams } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { FileExplorer } from '@/components/FileExplorer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Bot, Save, FileCode, Clock, Loader2 } from 'lucide-react';
import { RepoContent } from '@/types/github.types';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radix-ui/react-select';
import { toast } from 'sonner';
import { ExtendedRepository } from '@/types/repository.types';
import { Badge } from '@/components/ui/badge';
import { getLanguageColor } from '@/libs/utils';
import { ScrollArea } from '@radix-ui/react-scroll-area';

const MigrationPage = () => {
  const params = useParams();
  const { username, name } = params;
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<RepoContent[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState('claude');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<Map<string, string>>(
    new Map()
  );
  const [originalContents, setOriginalContents] = useState<Map<string, string>>(
    new Map()
  );
  const [saving, setSaving] = useState(false);
  const [repository, setRepository] = useState<ExtendedRepository | null>(null);

  const fetchRepositoryTree = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/migration/${username}/${name}/tree`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch repository tree');
      }

      const data = await response.json();
      setRepository(data.repository);
      // transforming tree data to match RepoContent interface
      const transformedTree = data.tree.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sha: item.sha,
        size: item.size,
        url: item.url,
        html_url: item.html_url,
        git_url: item.git_url,
        download_url: item.download_url,
        _links: item._links || {
          self: item.url,
          git: item.git_url,
          html: item.html_url,
        },
      }));
      setTreeData(transformedTree);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch repository tree:', error);
      toast.error('Error', {
        description: 'Failed to load repository structure',
      });
      setLoading(false);
    }
  }, [username, name]);

  useEffect(() => {
    fetchRepositoryTree();
  }, [fetchRepositoryTree]);

  const fetchFileContent = async (path: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/migration/${username}/${name}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Failed to fetch file content:', error);
      return null;
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!currentFile || !value) return;
    setFileContent(value);
    setModifiedFiles((prev) => new Map(prev).set(currentFile, value));
  };

  const handleFileClick = async (path: string, type: 'file' | 'dir') => {
    setCurrentFile(path);
    if (type === 'file') {
      // check if we already have the content
      if (modifiedFiles.has(path)) {
        setFileContent(modifiedFiles.get(path) || '');
      } else {
        const content = await fetchFileContent(path);
        if (content) {
          setFileContent(content);
          // store original content
          setOriginalContents((prev) => new Map(prev).set(path, content));
        }
      }
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const changes = Array.from(modifiedFiles.entries()).map(
        ([path, content]) => ({
          path,
          content,
          originalContent: originalContents.get(path) || '',
        })
      );

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/migration/${username}/${name}/save`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: changes }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      // clear modifications after successful save
      setModifiedFiles(new Map());
      toast.success('Changes saved', {
        description: 'Your changes have been successfully saved',
      });
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast.error('Error', {
        description: 'Failed to save changes',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAiSuggest = async () => {
    // later
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black/[88%]">
        <div className="animate-spin text-purple-500">
          <Clock className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/[88%]">
      <div className="mx-auto max-w-[90rem] p-6 space-y-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">
                  {repository?.name || name}
                </h1>
                {repository?.private && (
                  <Badge variant="outline" className="bg-zinc-800/50">
                    Private
                  </Badge>
                )}
              </div>
              <p className="text-zinc-400 text-lg">
                {repository?.description ||
                  'Select files to modify and get AI suggestions'}
              </p>
              {repository?.language && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: getLanguageColor(repository.language),
                    }}
                  />
                  <span className="text-sm text-zinc-300">
                    {repository.language}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-700">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="local">Local LLM</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="default"
                onClick={handleSaveChanges}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={saving || modifiedFiles.size === 0}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-16rem)]">
          <div className="col-span-2">
            <Card className="h-full bg-zinc-900/50 border-zinc-800 overflow-hidden">
              <FileExplorer
                contents={treeData}
                onFileClick={handleFileClick}
                currentPath={currentFile || ''}
                modifiedFiles={new Set(modifiedFiles.keys())}
              />
            </Card>
          </div>

          <div className="col-span-7">
            <Card className="h-full bg-zinc-900/50 border-zinc-800 overflow-hidden">
              {fileContent ? (
                <div className="h-full w-full">
                  <Editor
                    height="100%"
                    width="100%"
                    language="typescript"
                    theme="vs-dark"
                    value={fileContent}
                    onChange={handleEditorChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      readOnly: saving,
                      automaticLayout: true,
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <FileCode className="h-8 w-8 text-zinc-500 mx-auto" />
                    <p className="text-zinc-400">
                      Select a file to view its contents
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="col-span-3">
            <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col">
              <div className="p-4 border-b border-zinc-800 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    AI Suggestions
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiSuggest}
                    disabled={!currentFile}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Get Suggestions
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {aiSuggestions.length > 0 ? (
                    aiSuggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300"
                      >
                        {suggestion}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center py-8">
                      <div className="text-center space-y-3">
                        <Bot className="h-8 w-8 text-zinc-500 mx-auto" />
                        <p className="text-zinc-400">
                          Select a file to get AI suggestions
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;
function setRepository(repository: any) {
  throw new Error('Function not implemented.');
}
