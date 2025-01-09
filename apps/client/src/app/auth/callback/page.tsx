'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const username = searchParams.get('username');

    if (token && email && username) {
      localStorage.setItem('token', token);
      // store initial user data
      localStorage.setItem('user', JSON.stringify({ email, username }));

      // immediately redirect to dashboard
      router.push('/dashboard');

      // fetching full profile in the background
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((userData) => {
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(console.error); // Just log errors, don't redirect
    } else {
      router.push('/signin');
    }
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  );
}
