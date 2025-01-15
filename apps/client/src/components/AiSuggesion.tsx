'use client';
import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Bot, Send } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { toast } from 'sonner';

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
      } catch (e) {
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

  return (
    <div className="lg:col-span-3 h-[300px] lg:h-full">
      <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <h3 className="text-lg font-semibold text-white truncate">AI Chat</h3>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg text-sm ${
                  message.role === 'assistant'
                    ? 'bg-zinc-800/50 text-zinc-300'
                    : 'bg-purple-600/20 text-purple-200'
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 animate-pulse">
                AI is thinking...
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-zinc-800">
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
              className="bg-purple-600 hover:bg-purple-700"
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
