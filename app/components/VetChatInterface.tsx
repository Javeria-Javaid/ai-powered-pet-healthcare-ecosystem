
'use client';
import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

interface UserParticipant {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: UserParticipant;
  senderId: string;
}

interface Conversation {
  id: string;
  appointmentId: string;
  pet: any;
  veterinarian: any;
  owner: any;
  appointment: any;
}

interface VetChatInterfaceProps {
  conversationId: string;
  conversationContext: Conversation;
  currentUserId: string;
  onBack: () => void;
}

export default function VetChatInterface({
  conversationId,
  conversationContext,
  currentUserId,
  onBack
}: VetChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (isInitial = false) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        
        fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {});
        
        if (isInitial) {
          setLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      } else {
        if (isInitial) setError('Failed to load messages.');
      }
    } catch (err) {
      if (isInitial) setError('Connection error.');
    }
  };

  useEffect(() => {
    fetchMessages(true);
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(false);
    }, 3000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const contentToSend = newMessage;
    setNewMessage('');
    
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      content: contentToSend,
      createdAt: new Date().toISOString(),
      senderId: currentUserId,
      sender: { id: currentUserId, firstName: 'You', lastName: '', role: '' }
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToSend })
      });
      const data = await res.json();
      
      if (!data.success) {
        setError(data.error.message || 'Failed to send message.');
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setNewMessage(contentToSend);
      } else {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      setError('Connection error while sending.');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setNewMessage(contentToSend);
    } finally {
      setSending(false);
    }
  };

  const vetName = conversationContext.veterinarian?.user ? `Dr. ${conversationContext.veterinarian.user.firstName} ${conversationContext.veterinarian.user.lastName}` : 'Veterinarian';
  const ownerName = conversationContext.owner ? `${conversationContext.owner.firstName} ${conversationContext.owner.lastName}` : 'Owner';
  const clinicName = conversationContext.appointment?.clinic?.name || 'Clinic';
  
  return (
    <div className="flex flex-col h-[600px] border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-50 shadow-sm relative">
      <div className="flex items-center gap-3 p-4 bg-white border-b border-zinc-200">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 text-zinc-500 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="font-bold text-zinc-900 leading-tight">
             Chat for {conversationContext.pet?.name || 'Pet'}
          </h3>
          <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
            {vetName} � {clinicName}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
             <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : error && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-red-500 gap-2">
            <p className="text-sm font-semibold">{error}</p>
            <button onClick={() => fetchMessages(true)} className="text-xs bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 flex items-center gap-1">
               <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
             <p className="text-sm font-medium">No messages yet.</p>
             <p className="text-xs mt-1">Start the conversation below.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-end gap-2 max-w-[80%]">
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' 
                      : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 px-1 font-medium">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && messages.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-4 py-2 rounded-full shadow-lg font-medium animate-in fade-in slide-in-from-top-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-zinc-200 flex gap-2 items-end">
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 max-h-32 min-h-[44px] resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
