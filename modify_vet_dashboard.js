const fs = require('fs');
let content = fs.readFileSync('app/vet/dashboard/page.tsx', 'utf8');

if (!content.includes('VetChatInterface')) {
  content = content.replace("import Navbar from '../../components/Navbar';", "import Navbar from '../../components/Navbar';\nimport VetChatInterface from '../../components/VetChatInterface';\nimport { MessageCircle } from 'lucide-react';");
}

if (!content.includes("| 'messages'")) {
  content = content.replace("const [activeNav, setActiveNav] = useState<'dashboard' | 'patients' | 'appointments'>('dashboard');", "const [activeNav, setActiveNav] = useState<'dashboard' | 'patients' | 'appointments' | 'messages'>('dashboard');\n  const [conversations, setConversations] = useState<any[]>([]);\n  const [selectedConversation, setSelectedConversation] = useState<any>(null);");
}

const loadConversationsFn = `
  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (e) {}
  }

  useEffect(() => {
    if (activeNav === 'messages') {
      loadConversations();
      setSelectedConversation(null);
    }
  }, [activeNav]);
`;

if (!content.includes('loadConversations')) {
  content = content.replace("async function handleUpdateApptStatus", loadConversationsFn + "\n  async function handleUpdateApptStatus");
}


// Add sidebar button
const sidebarBtn = `
            <button
              onClick={() => { setActiveNav('messages'); }}
              className={\`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition \${
                activeNav === 'messages'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }\`}
            >
              <div className="flex items-center gap-3">
                <span><MessageCircle className="inline w-4 h-4" /></span> Messages
              </div>
              {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
                 <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}</span>
              )}
            </button>
`;

content = content.replace("<span><Calendar className=\"inline w-4 h-4\" /></span> Appointments\n            </button>", "<span><Calendar className=\"inline w-4 h-4\" /></span> Appointments\n            </button>\n" + sidebarBtn);


// Render Messages View
const messagesView = `
        {/* MESSAGES VIEW */}
        {activeNav === 'messages' && profile && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {selectedConversation ? (
              <VetChatInterface 
                conversationId={selectedConversation.id}
                conversationContext={selectedConversation}
                currentUserId={profile.id}
                onBack={() => { setSelectedConversation(null); loadConversations(); }}
              />
            ) : (
              <>
                <h3 className="text-xl font-bold">Messages</h3>
                <div className="grid grid-cols-1 gap-4">
                  {conversations.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <p className="text-sm text-zinc-500">You have no messages yet.</p>
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <div 
                        key={conv.id} 
                        onClick={() => setSelectedConversation(conv)}
                        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="flex gap-4 items-center">
                          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                             {conv.pet?.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <h4 className="font-bold text-sm text-zinc-900">{conv.pet?.name} <span className="text-zinc-400 font-normal">({conv.owner?.firstName} {conv.owner?.lastName})</span></h4>
                               {conv.unreadCount > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{conv.unreadCount}</span>
                               )}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1 max-w-sm">
                              {conv.latestMessage ? (
                                <>
                                  <span className="font-semibold">{conv.latestMessage.senderId === profile.id ? 'You: ' : ''}</span>
                                  {conv.latestMessage.content}
                                </>
                              ) : (
                                'No messages yet'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                             {new Date(conv.appointment?.dateTime).toLocaleDateString()}
                          </span>
                          {conv.latestMessage && (
                            <span className="text-[10px] text-zinc-400 mt-1">
                               {new Date(conv.latestMessage.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
`;

content = content.replace("</main>", messagesView + "\n      </main>");

fs.writeFileSync('app/vet/dashboard/page.tsx', content);
