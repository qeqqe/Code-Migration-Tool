'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Repository } from '@/types/repository.types';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Page = () => {
  const params = useParams();
  const { username, name } = params || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<string>('');
  const [repositoryData, setRepositoryData] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [repository, setRepository] = useState<Repository | null>(null);

  useEffect(() => {
    const fetchRepository = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
          router.push('/signin');
          return;
        }
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/repositories/get`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username, name }),
          }
        );

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/signin');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch repository data');
        }

        const data = await response.json();
        if (data) {
          setRepository(data);
        } else {
          setError('Repository not found');
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchRepository();
  }, [username, name, path, router]);

  const getMigrationStatusColor = (status: string) => {
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
    <div className="min-h-screen bg-black/[88%] p-6">
      <div className="max-w-7xl mx-auto">
        {repository ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {repository.fullName}
                </h1>
                <p className="text-zinc-400">{repository.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={getMigrationStatusColor(
                    repository.migrationStatus
                  )}
                >
                  {repository.migrationStatus}
                </Badge>
                {repository.private && (
                  <Badge variant="outline" className="bg-zinc-800/50">
                    Private
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-zinc-900/50 border-zinc-800">
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

              <Card className="bg-zinc-900/50 border-zinc-800">
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

              <Card className="bg-zinc-900/50 border-zinc-800">
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

              <Card className="bg-zinc-900/50 border-zinc-800">
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

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Repository Info */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">
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
                      <span className="text-white">{repository.language}</span>
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

              {/* Migration Info */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Migration Status</CardTitle>
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
                  {repository.technologies.length > 0 && (
                    <div>
                      <span className="text-zinc-400 block mb-2">
                        Technologies:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {repository.technologies.map((tech) => (
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
        ) : (
          <div className="flex h-[50vh] items-center justify-center text-zinc-400">
            No repository data available
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
