'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Send, FileSearch, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { toast } from 'sonner';
import ReactMarkdown, { Components } from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { io } from 'socket.io-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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

interface FileSelectProps {
  onSelect: (files: string[]) => void;
  currentFile?: string | null;
}

interface AiSuggestionProps {
  currentFile?: string | null;
  availableFiles: string[];
  selectedModel?: string;
}

const socket = io(
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
  {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false,
  }
);

const AiSuggestion = ({
  currentFile,
  availableFiles,
  selectedModel,
}: AiSuggestionProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentResponse, setCurrentResponse] = useState<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('Connecting to socket...');
    socket.connect();

    function onConnect() {
      console.log('Socket connected with ID:', socket.id);
      setSocketConnected(true);
    }

    function onConnectError(error: Error) {
      console.error('Socket connection error:', error);
      toast.error('Connection Error', { description: error.message });
    }

    function onDisconnect() {
      console.log('Socket disconnected!');
      setSocketConnected(false);
    }

    function onChatStart() {
      setLoading(true);
      setStreamingMessage('');
      setCurrentResponse('');
    }

    function onChatResponse(data: { content: string }) {
      setCurrentResponse((prev) => {
        const updated = prev + data.content;
        const message: Message = {
          id: 'streaming',
          content: updated,
          role: 'assistant',
          timestamp: new Date(),
        };

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== 'streaming');
          return [...filtered, message];
        });

        return updated;
      });
    }

    function onChatComplete() {
      setLoading(false);
      if (currentResponse) {
        const finalMessage: Message = {
          id: Date.now().toString(),
          content: currentResponse,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== 'streaming');
          return [...filtered, finalMessage];
        });
        setCurrentResponse('');
      }
    }

    function onChatError(error: { message: string }) {
      console.error('Chat error:', error);
      toast.error('AI Error', { description: error.message });
      setLoading(false);
    }

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('chat-start', onChatStart);
    socket.on('chat-response', onChatResponse);
    socket.on('chat-complete', onChatComplete);
    socket.on('chat-error', onChatError);

    return () => {
      console.log('Cleaning up socket connection...');
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('chat-start', onChatStart);
      socket.off('chat-response', onChatResponse);
      socket.off('chat-complete', onChatComplete);
      socket.off('chat-error', onChatError);
      socket.disconnect();
    };
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    if (!socketConnected) {
      console.log('Socket not connected, attempting to reconnect...');
      socket.connect();
      toast.error('Not connected', { description: 'Trying to reconnect...' });
      return;
    }

    console.log('Sending message:', input.trim());
    console.log('Selected files:', selectedFiles);
    console.log('Socket connected:', socket.connected);
    console.log('Socket ID:', socket.id);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    socket.emit(
      'chat',
      {
        message: userMessage.content,
        files: selectedFiles,
        model: selectedModel,
      },
      (response: any) => {
        console.log('Message acknowledged:', response);
      }
    );
  };

  const handleSelectFile = (value: string) => {
    setSelectedFile(value);
    if (!selectedFiles.includes(value)) {
      setSelectedFiles((prev) => [...prev, value]);
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white truncate">
              AI Chat
            </h3>
            <div className="flex items-center gap-2">
              {currentFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectFile(currentFile)}
                  className="shrink-0"
                >
                  <FileSearch className="w-4 h-4 mr-2" />
                  Add Current
                </Button>
              )}
              <Select value={selectedFile} onValueChange={handleSelectFile}>
                <SelectTrigger className="w-[180px] bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Select a file" />
                </SelectTrigger>
                <SelectContent>
                  {availableFiles.map((file) => (
                    <SelectItem key={file} value={file}>
                      {file.split('/').pop()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedFiles.map((file) => (
                <Badge
                  key={file}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {file.split('/').pop()}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() =>
                      setSelectedFiles((prev) => prev.filter((f) => f !== file))
                    }
                  />
                </Badge>
              ))}
            </div>
          )}
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
