'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const username = searchParams.get('username');

    if (token && email && username) {
      // Store the user info in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ email, username }));

      // redirect to dashboard
      router.push('/dashboard');
    } else {
      // handle error case
      router.push('/signin');
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Completing login...</h1>
        <p className="text-gray-500">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}
