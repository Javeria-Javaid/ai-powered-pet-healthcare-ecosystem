const fs = require('fs');
const path = require('path');
let content = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Import Chat UI
if (!content.includes('VetChatInterface')) {
  content = content.replace("import ChatWidget from '../components/ChatWidget';", "import ChatWidget from '../components/ChatWidget';\nimport VetChatInterface from '../components/VetChatInterface';");
}

// Add state for chat tab
if (!content.includes("| 'chat'")) {
  content = content.replace("useState<'dashboard' | 'pets' | 'appointments' | 'ai' | 'profile'>('dashboard');", "useState<'dashboard' | 'pets' | 'appointments' | 'ai' | 'profile' | 'chat'>('dashboard');\n  const [selectedConversation, setSelectedConversation] = useState<any>(null);");
}

// Function to handle open chat
const handleOpenChatFn = `
  async function handleOpenVetChat(appointment: any) {
    try {
      const res = await fetch(\`/api/appointments/\${appointment.id}/conversation\`);
      const data = await res.json();
      if (data.success) {
        setSelectedConversation({
          ...data.conversation,
          appointment,
          pet: profile?.pets?.find((p: any) => p.id === appointment.petId) || { name: 'Pet' },
          veterinarian: appointment.vet
        });
        setActiveTab('chat');
      } else {
        alert(data.error?.message || 'Could not open chat.');
      }
    } catch (err) {
      alert('Connection error opening chat.');
    }
  }
`;

if (!content.includes('handleOpenVetChat')) {
  content = content.replace("// Scroll to bottom of chat when messages update", handleOpenChatFn + "\n  // Scroll to bottom of chat when messages update");
}

// Add button to appointment cards
const btnCode = `
                  {(appt.status === 'CONFIRMED' || appt.status === 'COMPLETED') && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenVetChat(appt)}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
                      >
                        Chat with Vet
                      </button>
                    </div>
                  )}
                  {(appt.status === 'REQUESTED' || appt.status === 'CONFIRMED') && new Date(appt.dateTime) > new Date() && (
`;

content = content.replace("{(appt.status === 'REQUESTED' || appt.status === 'CONFIRMED') && new Date(appt.dateTime) > new Date() && (", btnCode);


// Render Chat UI
const chatUiRender = `
        {activeTab === 'chat' && selectedConversation && profile && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <VetChatInterface 
                conversationId={selectedConversation.id}
                conversationContext={selectedConversation}
                currentUserId={profile.id}
                onBack={() => setActiveTab('appointments')}
             />
          </div>
        )}
`;

content = content.replace("{/* 2.4 AI ASSISTANT */}", chatUiRender + "\n        {/* 2.4 AI ASSISTANT */}");

fs.writeFileSync('app/dashboard/page.tsx', content);
