const fs = require('fs');
let content = fs.readFileSync('app/vet/dashboard/page.tsx', 'utf8');

// Fix imports
if (!content.includes('MessageCircle')) {
  content = content.replace("import { PawPrint, Home, Calendar, Users, Clipboard, Building2, User, Settings, LogOut, Hand, Clock, Dog, X } from 'lucide-react';", "import { PawPrint, Home, Calendar, Users, Clipboard, Building2, User, Settings, LogOut, Hand, Clock, Dog, X, MessageCircle } from 'lucide-react';\nimport VetChatInterface from '@/app/components/VetChatInterface';");
}

// Fix states
if (!content.includes("const [conversations,")) {
  content = content.replace("const [activeNav, setActiveNav] = useState<'dashboard' | 'appointments' | 'patients' | 'records' | 'clinic' | 'profile'>('dashboard');", "const [activeNav, setActiveNav] = useState<'dashboard' | 'appointments' | 'patients' | 'records' | 'clinic' | 'profile' | 'messages'>('dashboard');\n  const [conversations, setConversations] = useState<any[]>([]);\n  const [selectedConversation, setSelectedConversation] = useState<any>(null);");
}

// Fix profile to vetProfile.user
content = content.replace(/profile\.id/g, "vetProfile?.userId");
content = content.replace(/&& profile &&/g, "&& vetProfile &&");

fs.writeFileSync('app/vet/dashboard/page.tsx', content);
