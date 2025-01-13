'use client';

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { RepoContent } from '@/types/github.types';
import {
  GitBranch,
  Star,
  GitFork,
  Eye,
  AlertCircle,
  Clock,
  FileCode,
  GitCommit,
  CheckCircle2,
  AlertOctagon,
  ChevronLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileExplorer } from '@/components/FileExplorer';
import { CodeViewer } from '@/components/CodeViewer';
import { getLanguageColor } from '@/libs/utils';
import { ExtendedRepository } from '@/types/repository.types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';

const getMigrationStatusColor = (status: string): string => {
  const colors = {
    PENDING: 'bg-yellow-500/10 text-yellow-500',
    ANALYZING: 'bg-blue-500/10 text-blue-500',
    READY: 'bg-green-500/10 text-green-500',
    MIGRATING: 'bg-purple-500/10 text-purple-500',
    COMPLETED: 'bg-green-500/10 text-green-500',
  };
  return (
    colors[status as keyof typeof colors] || 'bg-gray-500/10 text-gray-500'
  );
};

const Page = () => {
  const router = useRouter();
  const params = useParams();
  const { username, name } = params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<ExtendedRepository | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [contents, setContents] = useState<RepoContent[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [directoryContents, setDirectoryContents] = useState<RepoContent[]>([]);

  const fetchRepositoryContent = async (path?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL
        }/repositories/${username}/${name}${path ? `?path=${path}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch repository data');

      const data = await response.json();
      if (data) {
        setRepository(data.repository);

        if (data.currentContent) {
          setFileContent(data.currentContent.content);
          setCurrentPath(data.currentContent.path);
        } else {
          if (path) {
            setDirectoryContents((prev) => [...prev, ...data.contents]);
          } else {
            setDirectoryContents(data.contents);
          }
          setFileContent(null);
          setCurrentPath(path || '');
        }
        setContents(data.contents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositoryContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, name]);

  const handleFileClick = async (path: string, type: 'file' | 'dir') => {
    setCurrentPath(path);

    if (type === 'dir') {
      setCurrentDirectory(path);
      setFileContent(null);
    }

    fetchRepositoryContent(path);
  };

  const handleBackClick = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    setCurrentPath(parentPath);
    fetchRepositoryContent(parentPath);
  };

  const handleStartMigration = () => {
    router.push(`/migration/${username}/${name}`);
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

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black/[88%]">
        <div className="text-red-500 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/[88%]">
      <div className="mx-auto max-w-[90rem] p-6 space-y-8">
        {repository ? (
          <div className="space-y-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-white">
                      {repository.name}
                    </h1>
                    {repository.private && (
                      <Badge variant="outline" className="bg-zinc-800/50">
                        Private
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-400 text-lg max-w-3xl">
                    {repository.description}
                  </p>
                  <div className="flex items-center gap-6 pt-2">
                    {repository.language && (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: getLanguageColor(
                              repository.language
                            ),
                          }}
                        />
                        <span className="text-sm text-zinc-300">
                          {repository.language}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <GitBranch className="h-4 w-4" />
                      {repository.defaultBranch}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Badge
                    variant="outline"
                    className={`${getMigrationStatusColor(
                      repository.migrationStatus
                    )} text-sm px-3 py-1`}
                  >
                    {repository.migrationStatus}
                  </Badge>
                  <Button
                    variant="default"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={handleStartMigration}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Start Migration
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 h-[36rem]">
              {' '}
              <div className="w-full lg:w-80 shrink-0 h-full">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col">
                  {currentPath && (
                    <div className="shrink-0 p-2 border-b border-zinc-800">
                      <button
                        onClick={handleBackClick}
                        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                    </div>
                  )}
                  <FileExplorer
                    contents={directoryContents}
                    currentPath={currentPath}
                    onFileClick={(path, type) => handleFileClick(path, type)}
                  />
                </div>
              </div>
              <div className="flex-1 h-full bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                {fileContent ? (
                  <CodeViewer code={fileContent} path={currentPath} />
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
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-zinc-400">Stars</span>
                    </div>
                    <span className="text-white font-medium">
                      {repository.stargazersCount}
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <GitFork className="h-4 w-4 text-blue-500" />
                      <span className="text-zinc-400">Forks</span>
                    </div>
                    <span className="text-white font-medium">
                      {repository.forksCount}
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      <span className="text-zinc-400">Watchers</span>
                    </div>
                    <span className="text-white font-medium">
                      {repository.watchersCount}
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-zinc-400">Issues</span>
                    </div>
                    <span className="text-white font-medium">
                      {repository.openIssuesCount}
                    </span>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-white font-semibold">
                      Repository Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-zinc-400" />
                      <span className="text-zinc-400">Default Branch:</span>
                      <span className="text-white">
                        {repository.defaultBranch}
                      </span>
                    </div>
                    {repository.language && (
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-400">Language:</span>
                        <span className="text-white">
                          {repository.language}
                        </span>
                      </div>
                    )}
                    {repository.totalFiles && (
                      <div className="flex items-center gap-2">
                        <GitCommit className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-400">Total Files:</span>
                        <span className="text-white">
                          {repository.totalFiles}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-white font-semibold">
                      Migration Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      {repository.migrationEligible ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertOctagon className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-zinc-400">Migration Eligible:</span>
                      <span className="text-white">
                        {repository.migrationEligible ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {(repository.technologies?.length ?? 0) > 0 && (
                      <div>
                        <span className="text-zinc-400 block mb-2">
                          Technologies:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {repository.technologies?.map((tech) => (
                            <Badge
                              key={tech}
                              variant="secondary"
                              className="bg-zinc-800"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {repository.affectedFiles && (
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-400">Affected Files:</span>
                        <span className="text-white">
                          {repository.affectedFiles}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[80vh] items-center justify-center">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 text-zinc-500 mx-auto" />
              <p className="text-zinc-400">No repository data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
