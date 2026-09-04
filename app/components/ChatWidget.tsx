'use client';
import { Hand, X, MessageCircle, PawPrint } from 'lucide-react';


import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hi there! I am the PETIVA assistant. Ask me anything about our platform, features, or how to register!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/landing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an issue. Please try again.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your network.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center text-2xl transition cursor-pointer hover:scale-105 active:scale-95"
        title="Ask PETIVA AI"
      >
        {isOpen ? <X className="inline w-4 h-4" /> : <MessageCircle className="inline w-4 h-4" />}
      </button>

      {/* Floating Panel Popup */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[480px] bg-white border border-zinc-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 text-zinc-900">
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl"><PawPrint className="inline w-4 h-4" /></span>
              <div>
                <h4 className="font-bold text-sm">PETIVA Assistant</h4>
                <p className="text-[10px] opacity-80">Platform Info & Help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-sm">
              <X className="inline w-4 h-4" />
            </button>
          </div>

          {/* Messages stream */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                    : 'mr-auto bg-zinc-150 text-zinc-800 rounded-bl-none'
                }`}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-sm font-bold my-1 text-zinc-950" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xs font-bold my-1 text-zinc-900" {...props} />,
                      p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-1.5 flex flex-col gap-0.5" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-1.5 flex flex-col gap-0.5" {...props} />,
                      li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-zinc-950" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            ))}
            {loading && (
              <div className="mr-auto bg-zinc-150 text-zinc-500 rounded-2xl rounded-bl-none p-3 text-[10px] italic">
                Writing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} className="p-4 border-t border-zinc-150 flex gap-3 items-end">
            <textarea
              required
              placeholder="Ask PETIVA anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) handleSend(e);
                }
              }}
              rows={1}
              className="flex-grow resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm min-h-[44px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
            <button
              type="submit" disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center shrink-0 h-[44px]"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
