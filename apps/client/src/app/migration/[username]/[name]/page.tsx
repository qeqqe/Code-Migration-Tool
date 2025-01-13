'use client';

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { FileExplorer } from '@/components/FileExplorer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import {
  Bot,
  Save,
  GitBranch,
  RefreshCw,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import { RepoContent } from '@/types/github.types';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radix-ui/react-select';

const MigrationPage = () => {
  const params = useParams();
  const { username, name } = params;
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<RepoContent[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState('claude');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchRepositoryTree();
  }, [username, name]);

  const fetchRepositoryTree = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/repositories/${username}/${name}/tree`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setTreeData(data.tree);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch repository tree:', error);
    }
  };

  const handleFileClick = async (path: string) => {
    setCurrentFile(path);
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/repositories/${username}/${name}/content?path=${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    setFileContent(data.content);
  };

  const handleSaveChanges = async () => {
    // later
  };

  const handleAiSuggest = async () => {
    // later
  };

  return (
    <div className="min-h-screen bg-black/[88%] p-6">
      <div className="max-w-[90rem] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Migration: {name}</h1>
          <div className="flex items-center gap-4">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
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
            <Button variant="default" onClick={handleSaveChanges}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          <div className="col-span-2">
            <Card className="h-full bg-zinc-900/50 border-zinc-800">
              <FileExplorer
                contents={treeData}
                onFileClick={handleFileClick}
                currentPath={currentFile || ''}
              />
            </Card>
          </div>

          <div className="col-span-7">
            <Card className="h-full bg-zinc-900/50 border-zinc-800">
              <Editor
                height="100%"
                language="typescript"
                theme="vs-dark"
                value={fileContent}
                onChange={(value) => setFileContent(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
              />
            </Card>
          </div>

          <div className="col-span-3">
            <Card className="h-full bg-zinc-900/50 border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  AI Suggestions
                </h3>
                <Button variant="outline" size="sm" onClick={handleAiSuggest}>
                  <Bot className="w-4 h-4 mr-2" />
                  Get Suggestions
                </Button>
              </div>
              <div className="space-y-4">
                {aiSuggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;
