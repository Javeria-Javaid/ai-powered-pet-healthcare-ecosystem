const fs = require('fs');
let content = fs.readFileSync('app/vet/dashboard/page.tsx', 'utf8');

if (!content.includes('MessageCircle')) {
  content = "import { MessageCircle } from 'lucide-react';\n" + content;
}

if (!content.includes('import VetChatInterface')) {
  content = "import VetChatInterface from '../../components/VetChatInterface';\n" + content;
}

fs.writeFileSync('app/vet/dashboard/page.tsx', content);
