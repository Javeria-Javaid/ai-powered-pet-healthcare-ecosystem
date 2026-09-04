const fs = require('fs');

let vetDash = fs.readFileSync('app/vet/dashboard/page.tsx', 'utf8');
vetDash = vetDash.replace("Dog, X } from 'lucide-react';", "Dog, X, MessageCircle } from 'lucide-react';");
fs.writeFileSync('app/vet/dashboard/page.tsx', vetDash, 'utf8');

