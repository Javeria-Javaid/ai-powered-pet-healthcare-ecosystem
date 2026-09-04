const fs = require('fs');

// Fix app/vet/dashboard/page.tsx
let vetDash = fs.readFileSync('app/vet/dashboard/page.tsx', 'utf8');
vetDash = vetDash.replace("import VetChatInterface from '../../components/VetChatInterface';\n'use client';", "'use client';\nimport VetChatInterface from '../../components/VetChatInterface';");
vetDash = vetDash.replace("import { MessageCircle } from 'lucide-react';\n'use client';", "'use client';\nimport { MessageCircle } from 'lucide-react';");
fs.writeFileSync('app/vet/dashboard/page.tsx', vetDash, 'utf8');

// Resave VetChatInterface.tsx with node to fix any UTF8 BOM or powershell encoding issues
let chatUi = fs.readFileSync('app/components/VetChatInterface.tsx', 'utf8');
fs.writeFileSync('app/components/VetChatInterface.tsx', chatUi, 'utf8');
