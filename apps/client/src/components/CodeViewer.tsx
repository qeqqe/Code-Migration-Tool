import { useEffect, useState } from 'react';
import { getHighlighter, type BundledLanguage } from 'shiki';

interface CodeViewerProps {
  code: string;
  language?: string;
  path?: string;
}

export function CodeViewer({ code, language, path }: CodeViewerProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const fileExtension = path?.split('.').pop() || '';

  const getLanguageFromExtension = (ext: string): BundledLanguage => {
    const languageMap: Record<string, BundledLanguage> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      c: 'c',
      cpp: 'cpp',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'bash',
    };

    return languageMap[ext.toLowerCase()] || 'plaintext';
  };

  useEffect(() => {
    async function highlightCode() {
      const highlighter = await getHighlighter({
        themes: ['github-dark'],
        langs: [
          'typescript',
          'javascript',
          'tsx',
          'jsx',
          'json',
          'markdown',
          'html',
          'css',
          'python',
          'java',
          'go',
          'rust',
          'c',
          'cpp',
          'yaml',
          'bash',
          'plaintext',
        ] as BundledLanguage[],
      });

      const detectedLang =
        language || getLanguageFromExtension(fileExtension) || 'plaintext';

      const highlighted = highlighter.codeToHtml(code, {
        lang: detectedLang as BundledLanguage,
        theme: 'github-dark',
      });

      setHighlightedCode(highlighted);
    }

    highlightCode();
  }, [code, language, fileExtension]);

  return (
    <div className="h-full relative code-viewer w-full">
      <div className="h-full overflow-x-auto">
        <div className="relative flex min-h-full">
          {/* line numbers */}
          <div className="select-none sticky left-0 z-10 flex-none bg-zinc-900/50 text-zinc-500 text-right font-mono text-sm py-4 pr-4 pl-4 border-r border-zinc-800">
            {code.split('\n').map((_, i) => (
              <div key={i + 1} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>
          <div className="overflow-visible w-full">
            <div
              className="p-4 font-mono text-sm leading-6 whitespace-pre inline-block min-w-full"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
