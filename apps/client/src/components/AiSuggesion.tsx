'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Send } from 'lucide-react';
import { Input } from './ui/input';
import { toast } from 'sonner';
import ReactMarkdown, { Components } from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeProps {
  children?: React.ReactNode;
  className?: string;
  node?: any;
  inline?: boolean;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const AiSuggestion = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: userMessage.content }),
        }
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from server');
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Chat Error', {
        description: `Error: ${
          error instanceof Error ? error.message : 'Failed to get AI response'
        }`,
      });

      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `Error: ${
          error instanceof Error ? error.message : 'Failed to get AI response'
        }`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const markdownComponents: Components = {
    code: ({ className, children, inline }: CodeProps) => {
      if (inline) {
        return (
          <code className="bg-zinc-800/50 rounded px-1.5 py-0.5">
            {children}
          </code>
        );
      }

      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      return (
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          PreTag="div"
          customStyle={{
            margin: 0,
            backgroundColor: 'rgba(24, 24, 27, 0.5)',
            padding: '1rem',
            borderRadius: '0.375rem',
            border: '1px solid rgb(39, 39, 42)',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    },
  };

  return (
    <div className="lg:col-span-3 h-[300px] lg:h-full">
      <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white truncate">AI Chat</h3>
        </div>

        {/* Messages Container - Fixed Height with Auto Scroll */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg text-sm ${
                    message.role === 'assistant'
                      ? 'bg-zinc-800/50 text-zinc-300'
                      : 'bg-purple-600/20 text-purple-200'
                  }`}
                >
                  <ReactMarkdown
                    className="prose prose-invert max-w-none break-words whitespace-pre-wrap"
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ))}
              {loading && (
                <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 animate-pulse">
                  AI is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="shrink-0 p-4 border-t border-zinc-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="bg-zinc-800/50 border-zinc-700"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AiSuggestion;
