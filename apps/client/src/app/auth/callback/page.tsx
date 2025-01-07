'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const username = searchParams.get('username');

  useEffect(() => {
    const handleCallback = async () => {
      if (!token) {
        router.push('/auth/error?message=No token provided');
        return;
      }

      try {
        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem(
          'user',
          JSON.stringify({
            email: email,
            username: username,
          })
        );

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/auth/error?message=Failed to complete authentication');
      }
    };

    handleCallback();
  }, [token, email, username, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-500" />
        <p className="mt-4 text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
}
