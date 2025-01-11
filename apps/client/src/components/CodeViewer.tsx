import { useEffect, useState } from 'react';
import { getHighlighter, type BundledLanguage } from 'shiki';
import { ScrollArea } from './ui/scroll-area';

interface CodeViewerProps {
  code: string;
  language?: string;
  path?: string;
}

// idk much about this i just picked this up fromm docs

export function CodeViewer({ code, language, path }: CodeViewerProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const fileExtension = path?.split('.').pop() || '';

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

      const detectedLang = (language ||
        highlighter
          .getLoadedLanguages()
          .find((lang) => new RegExp(`^${lang}$`, 'i').test(fileExtension)) ||
        'plaintext') as BundledLanguage;

      const highlighted = highlighter.codeToHtml(code, {
        lang: detectedLang,
        theme: 'github-dark',
      });

      setHighlightedCode(highlighted);
    }

    highlightCode();
  }, [code, language, fileExtension]);

  return (
    <div className="h-full relative code-viewer">
      <ScrollArea className="h-full">
        <div className="relative flex min-h-full">
          {/* line numbers */}
          <div className="select-none sticky left-0 flex-none bg-zinc-900/50 text-zinc-500 text-right font-mono text-sm py-4 pr-4 pl-4 border-r border-zinc-800">
            {code.split('\n').map((_, i) => (
              <div key={i + 1} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            <div
              className="p-4 font-mono text-sm leading-6"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
