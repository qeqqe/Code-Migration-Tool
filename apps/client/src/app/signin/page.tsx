'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="absolute left-4 top-4 text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-6 w-6" />
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Or{' '}
            <Link
              href="/signup"
              className="font-medium text-purple-400 hover:text-purple-300"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <Label htmlFor="email-address" className="text-gray-300">
                Email address
              </Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
