import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Code, Zap, RefreshCw } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <main className="max-w-4xl text-center">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          <span className="block text-white">Transform Your Code</span>
          <span className="block bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text min-h-[4.3rem] text-transparent">
            Migrate with Ease
          </span>
        </h1>
        <p className="mb-8 text-xl text-gray-300 sm:text-2xl">
          Effortlessly convert your legacy code to modern standards. Embrace the
          future of development.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          <div className="rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50 p-6 backdrop-blur-sm">
            <Code className="mb-4 h-8 w-8 text-purple-400" />
            <h2 className="mb-2 text-lg font-semibold text-white">
              Smart Analysis
            </h2>
            <p className="text-sm text-gray-400">
              Our AI analyzes your code structure and patterns
            </p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50 p-6 backdrop-blur-sm">
            <Zap className="mb-4 h-8 w-8 text-pink-400" />
            <h2 className="mb-2 text-lg font-semibold text-white">
              Rapid Conversion
            </h2>
            <p className="text-sm text-gray-400">
              Lightning-fast transformation to modern syntax
            </p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50 p-6 backdrop-blur-sm">
            <RefreshCw className="mb-4 h-8 w-8 text-blue-400" />
            <h2 className="mb-2 text-lg font-semibold text-white">
              Continuous Updates
            </h2>
            <p className="text-sm text-gray-400">
              Stay current with the latest language features
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Button
            asChild
            size="lg"
            className="group w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Link href="/signup">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
