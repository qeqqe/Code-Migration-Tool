import { useState, useEffect } from 'react';
import { RepositoriesResponse } from '@/types/repository.types';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useRepositories() {
  const [repositories, setRepositories] = useState<RepositoriesResponse>({
    githubRepos: [],
    localRepos: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepositories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/repositories/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch repositories');

      const data = await response.json();
      setRepositories(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch repositories'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  return { repositories, loading, error, refetch: fetchRepositories };
}
