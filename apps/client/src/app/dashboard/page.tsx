'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitHubLogoIcon, StarFilledIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { Github, LogOut, Loader2 } from 'lucide-react';
import { useRepositories } from '@/hooks/useRepositories';

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

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();
  const { repositories, loading, error } = useRepositories();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/signin');
          return;
        }

        const BACKEND_URL =
          process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${BACKEND_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/signin');
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/signin');
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-4">
      <Card className="mx-auto max-w-4xl bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={user.githubProfile?.avatarUrl}
                  alt={user.githubProfile?.name || user.username}
                />
                <AvatarFallback>
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  {user.githubProfile?.name || user.username}
                </CardTitle>
                <CardDescription className="mt-1">
                  {user.githubProfile?.bio || user.email}
                </CardDescription>
                {user.githubProfile && (
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
                    <span>{user.githubProfile.followers} followers</span>
                    <span>{user.githubProfile.following} following</span>
                    <span>{user.githubProfile.publicRepos} repositories</span>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleLogout} variant="ghost">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="repositories" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-700">
              <TabsTrigger value="repositories">Repositories</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="repositories" className="mt-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-400">{error}</div>
              ) : repositories.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No repositories found
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {repositories.map((repo) => (
                    <Card key={repo.id} className="bg-zinc-700 border-zinc-600">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <GitHubLogoIcon className="mr-2 h-5 w-5" />
                          {repo.name}
                        </CardTitle>
                        <CardDescription>{repo.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-gray-400">
                          <div className="flex items-center mr-4">
                            <StarFilledIcon className="mr-1 h-4 w-4" />
                            {repo.stargazersCount}
                          </div>
                          {repo.language && (
                            <div className="mr-4">{repo.language}</div>
                          )}
                          {repo.private && (
                            <div className="bg-zinc-600 px-2 py-0.5 rounded text-xs">
                              Private
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-4">
              <Card className="bg-zinc-700 border-zinc-600">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {user.githubProfile?.company && (
                      <div>
                        <Label>Company</Label>
                        <Input
                          value={user.githubProfile.company}
                          readOnly
                          className="bg-zinc-600 border-zinc-500"
                        />
                      </div>
                    )}
                    {user.githubProfile?.location && (
                      <div>
                        <Label>Location</Label>
                        <Input
                          value={user.githubProfile.location}
                          readOnly
                          className="bg-zinc-600 border-zinc-500"
                        />
                      </div>
                    )}
                    {user.githubProfile?.blog && (
                      <div>
                        <Label>Website</Label>
                        <Input
                          value={user.githubProfile.blog}
                          readOnly
                          className="bg-zinc-600 border-zinc-500"
                        />
                      </div>
                    )}
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={user.email}
                        readOnly
                        className="bg-zinc-600 border-zinc-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
