'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Github, LogOut, Loader2 } from 'lucide-react';
import { useRepositories } from '@/hooks/useRepositories';

interface UserInfo {
  email: string;
  username: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();

  const { repositories, loading, error } = useRepositories();

  useEffect(() => {
    const userInfo = localStorage.getItem('user');
    if (!userInfo) {
      router.push('/signin');
      return;
    }
    setUser(JSON.parse(userInfo));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/signin');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="border-b border-gray-800 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Code Migration Tool</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-lg bg-gray-800 p-6">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-purple-500 p-3">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.username}</h2>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-medium">Recent Migrations</h3>
            <p className="text-gray-400">No migrations yet</p>
          </div>
          <div className="rounded-lg bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-medium">Connected Repositories</h3>
            {loading ? (
              <div className="flex items-center space-x-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading repositories...</span>
              </div>
            ) : error ? (
              <p className="text-red-400">{error}</p>
            ) : repositories.length === 0 ? (
              <p className="text-gray-400">No repositories connected</p>
            ) : (
              <ul className="space-y-2">
                {repositories.map((repo) => (
                  <li
                    key={repo.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-200">{repo.fullName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/repositories/${repo.id}`)}
                    >
                      View
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-medium">Migration Stats</h3>
            <p className="text-gray-400">
              {repositories.length > 0
                ? `${repositories.length} repositories connected`
                : 'No statistics available'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
