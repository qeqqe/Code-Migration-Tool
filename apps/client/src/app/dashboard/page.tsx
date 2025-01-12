'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitHubLogoIcon, StarFilledIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Loader2,
  Code2,
  GitBranch,
  LucideFolderPlus,
  CheckCircle2,
  FolderGit2,
  FileIcon,
} from 'lucide-react';
import { useRepositories } from '@/hooks/useRepositories';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { handleGithubLogin } from '@/libs/auth';
import { Input } from '@/components/ui/input';
import { cn } from '@/libs/utils';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CreateRepoDialog } from '@/components/CreateRepoDialog';
import { RepositoriesResponse, Repository } from '@/types/repository.types';

interface UserInfo {
  email: string;
  username: string;
  githubProfile?: {
    avatarUrl: string;
    name: string;
    bio: string;
    login: string;
    followers: number;
    following: number;
    publicRepos: number;
    company?: string;
    location?: string;
    blog?: string;
  };
}

interface FileState {
  files: FileList | null;
  uploading: boolean;
  progress: number;
  uploadedFiles: string[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();
  const {
    repositories,
    loading,
    error,
    refetch: refetchRepositories,
  } = useRepositories();
  const { toast } = useToast();
  const [fileState, setFileState] = useState<FileState>({
    files: null,
    uploading: false,
    progress: 0,
    uploadedFiles: [],
  });
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const sortedGithubRepos = [...repositories.githubRepos].sort(
    (a: Repository, b: Repository) =>
      (b.stargazersCount || 0) - (a.stargazersCount || 0)
  );

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/signin');
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token) {
        router.push('/signin');
        return;
      }

      try {
        // initial data
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // fresh data
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch user data');

        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Error:', error);
        // only redirect if we don't have stored data
        if (!storedUser) {
          router.push('/signin');
        }
      }
    };

    fetchUserData();
  }, [router]);

  const handleRepoClick = (username: string, name: string) => {
    router.push(`/dashboard/${username}/${name}`);
  };

  const uploadFiles = async (files: File[]) => {
    if (!selectedRepoId) {
      toast({
        title: 'Error',
        description: 'Please select or create a repository first',
        variant: 'destructive',
      });
      return;
    }

    setFileState((prev) => ({ ...prev, uploading: true, progress: 0 }));
    console.log(
      `Starting upload of ${files.length} files to repo ${selectedRepoId}`
    );

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);

      if (file.size > 80 * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds size limit:`, file.size);
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 80MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      if (file.webkitRelativePath.includes('node_modules')) {
        console.log(`Skipping node_modules file: ${file.name}`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        console.log(`Uploading ${file.name}...`);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/repositories/local/${selectedRepoId}/upload`,
          {
            method: 'POST',
            body: formData,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          // ff response is not JSON, creating a default result
          result = {
            success: response.ok,
            message: response.ok
              ? 'File uploaded successfully'
              : 'Upload failed',
            fileName: file.name,
          };
        }

        if (!response.ok) throw new Error(result.message || 'Upload failed');

        setFileState((prev) => ({
          ...prev,
          progress: ((i + 1) / files.length) * 100,
          uploadedFiles: [...prev.uploadedFiles, file.name],
        }));

        toast({
          title: result.success ? 'Success' : 'Warning',
          description: `${file.name}: ${result.message || 'File uploaded'}`,
          variant: result.success ? 'default' : 'destructive',
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          variant: 'destructive',
        });
      }
    }

    console.log('Upload process completed');
    setFileState((prev) => ({ ...prev, uploading: false }));
  };

  const handleCreateRepo = async (
    data: { name: string; description: string },
    files: File[]
  ) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');

    files.forEach((file) => {
      if (!file.webkitRelativePath.includes('node_modules')) {
        formData.append('files', file);
      }
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/repositories/local`,
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to create repository');

      const result = await response.json();
      setShowCreateRepo(false);
      toast({
        title: 'Success',
        description: `Repository created with ${result.files.length} files`,
      });

      // refresh repositories list
      refetchRepositories();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create repository',
        variant: 'destructive',
      });
    }
  };

  // show loading state only if no user data
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const hasRepositories =
    repositories.githubRepos.length > 0 || repositories.localRepos.length > 0;

  const totalReposCount =
    (repositories?.githubRepos?.length || 0) +
    (repositories?.localRepos?.length || 0);

  return (
    <div className="min-h-screen bg-black/[88%] p-4 text-zinc-200 overflow-x-hidden">
      <div className="mx-auto max-w-6xl space-y-8">
        <nav className="flex items-center justify-between rounded-lg bg-zinc-900/50 p-4 backdrop-blur-sm border border-zinc-800/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center">
                CodeMigrate
                <GitBranch className="h-4 w-4 ml-2 text-purple-400" />
              </h1>
              <p className="text-xs text-zinc-400">Auto-migration tool</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </nav>

        <div className="rounded-lg bg-zinc-900/50 p-6 backdrop-blur-sm border border-zinc-800/50">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24 ring-2 ring-purple-500/20">
              <AvatarImage
                src={user.githubProfile?.avatarUrl}
                alt={user.githubProfile?.name || user.username}
              />
              <AvatarFallback className="bg-zinc-800 text-lg">
                {user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                {user.githubProfile?.name || user.username}
              </h2>
              <p className="text-zinc-400">
                {user.githubProfile?.bio || user.email}
              </p>
              {user.githubProfile && (
                <div className="flex items-center space-x-6 pt-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                    <span className="text-sm text-zinc-400">
                      {user.githubProfile.followers} followers
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-pink-400"></div>
                    <span className="text-sm text-zinc-400">
                      {user.githubProfile.following} following
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                    <span className="text-sm text-zinc-400">
                      {totalReposCount} repositories
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="repositories" className="w-full">
          <TabsList className="inline-flex mb-6 bg-transparent border py-2 border-zinc-800 rounded-lg w-full sm:w-auto">
            <TabsTrigger
              value="repositories"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4 my-[0.4rem] rounded-md"
            >
              Repositories
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4 py-1 rounded-md"
            >
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repositories" className="mt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-400">{error}</div>
            ) : !hasRepositories && user.githubProfile ? (
              <div className="text-center py-12 text-zinc-500">
                No repositories found
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedGithubRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-purple-500/50 hover:bg-zinc-800/50"
                    onClick={() => handleRepoClick(user.username, repo.name)}
                  >
                    <div className="flex items-center space-x-3">
                      <GitHubLogoIcon className="h-5 w-5 text-zinc-400" />
                      <h3 className="font-medium text-zinc-200">{repo.name}</h3>
                    </div>
                    {repo.description && (
                      <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center space-x-4">
                      <div className="flex items-center text-zinc-500 text-sm">
                        <StarFilledIcon className="mr-1 h-4 w-4" />
                        {repo.stargazersCount}
                      </div>
                      {repo.language && (
                        <div className="flex items-center text-sm">
                          <span
                            className="h-3 w-3 rounded-full mr-1.5"
                            style={{
                              backgroundColor: getLanguageColor(repo.language),
                            }}
                          ></span>
                          <span className="text-zinc-400">{repo.language}</span>
                        </div>
                      )}
                      {repo.private && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-500">
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {repositories.localRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-purple-500/50 hover:bg-zinc-800/50"
                    onClick={() => handleRepoClick('local', repo.name)}
                  >
                    <div className="flex items-center space-x-3">
                      <FolderGit2 className="h-5 w-5 text-zinc-400" />
                      <h3 className="font-medium text-zinc-200">{repo.name}</h3>
                    </div>
                    {repo.description && (
                      <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center space-x-4">
                      <div className="flex items-center text-zinc-500 text-sm">
                        <FileIcon className="mr-1 h-4 w-4" />
                        {repo.files.length} files
                      </div>
                      <span className="text-xs text-zinc-400">
                        Created {new Date(repo.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!user.githubProfile && totalReposCount === 0 && (
              <>
                <div className="text-center py-12">
                  <div className="space-y-6">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        Choose Your Repository Source
                      </h3>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="relative group">
                          <Button
                            onClick={handleGithubLogin}
                            type="button"
                            variant="outline"
                            className="w-full h-32 bg-zinc-800/50 border-zinc-700 text-white hover:bg-zinc-700/50 hover:border-purple-500/50 transition-all"
                          >
                            <div className="flex flex-col items-center gap-3">
                              <GitHubLogoIcon className="h-8 w-8" />
                              <span className="text-sm">
                                Connect with GitHub
                              </span>
                              <span className="text-xs text-zinc-400">
                                Import repositories directly
                              </span>
                            </div>
                          </Button>
                        </div>

                        <div className="relative group">
                          <label
                            htmlFor="file-upload"
                            className={cn(
                              'flex flex-col items-center justify-center w-full h-32',
                              'bg-zinc-800/50 border-2 border-dashed border-zinc-700',
                              'rounded-lg cursor-pointer',
                              'hover:bg-zinc-700/50 hover:border-purple-500/50',
                              'transition-all duration-200'
                            )}
                          >
                            <div className="flex flex-col items-center gap-3">
                              <LucideFolderPlus className="h-8 w-8 text-zinc-400 group-hover:text-purple-400" />
                              <span className="text-sm text-zinc-200">
                                {fileState.uploading
                                  ? 'Uploading...'
                                  : 'Upload Local Files'}
                              </span>
                              <span className="text-xs text-zinc-400">
                                Max 80MB, no node_modules
                              </span>
                            </div>
                            <Input
                              id="file-upload"
                              type="file"
                              multiple
                              className="hidden"
                              disabled={fileState.uploading}
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  await uploadFiles(files);
                                }
                              }}
                            />
                          </label>

                          {fileState.uploading && (
                            <div className="mt-4 space-y-2">
                              <Progress
                                value={fileState.progress}
                                className="h-2"
                              />
                              <p className="text-sm text-zinc-400 text-center">
                                Uploading... {Math.round(fileState.progress)}%
                              </p>
                            </div>
                          )}

                          {fileState.uploadedFiles.length > 0 &&
                            !fileState.uploading && (
                              <div className="mt-4">
                                <p className="text-sm text-zinc-400 mb-2">
                                  Uploaded files:
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {fileState.uploadedFiles.map((file, i) => (
                                    <div
                                      key={i}
                                      className="text-sm text-zinc-300 flex items-center gap-2"
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      {file}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowCreateRepo(true)}
                        className="w-full"
                        variant="outline"
                      >
                        Create New Repository
                      </Button>
                      <CreateRepoDialog
                        open={showCreateRepo}
                        onOpenChange={setShowCreateRepo}
                        onSubmit={handleCreateRepo}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>View your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-zinc-400">Email</Label>
                    <p className="text-white mt-1">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Username</Label>
                    <p className="text-white mt-1">{user.username}</p>
                  </div>
                  <div>
                    {!user.githubProfile && (
                      <div className="mt-6">
                        <Button
                          onClick={handleGithubLogin}
                          type="button"
                          variant="outline"
                          className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                        >
                          <GitHubLogoIcon className="mr-2 h-4 w-4" />
                          Sign up with GitHub
                        </Button>
                      </div>
                    )}
                  </div>
                  {user.githubProfile && (
                    <>
                      <div>
                        <Label className="text-zinc-400">GitHub Login</Label>
                        <p className="text-white mt-1">
                          {user.githubProfile.login}
                        </p>
                      </div>
                      {user.githubProfile.company && (
                        <div>
                          <Label className="text-zinc-400">Company</Label>
                          <p className="text-white mt-1">
                            {user.githubProfile.company}
                          </p>
                        </div>
                      )}
                      {user.githubProfile.location && (
                        <div>
                          <Label className="text-zinc-400">Location</Label>
                          <p className="text-white mt-1">
                            {user.githubProfile.location}
                          </p>
                        </div>
                      )}
                      {user.githubProfile.blog && (
                        <div>
                          <Label className="text-zinc-400">Website</Label>
                          <a
                            href={user.githubProfile.blog}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 mt-1 block"
                          >
                            {user.githubProfile.blog}
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
  };
  return colors[language] || '#8b949e';
}
