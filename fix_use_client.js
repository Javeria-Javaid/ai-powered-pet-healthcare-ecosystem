const fs = require('fs');

let vetDash = fs.readFileSync('app/vet/dashboard/page.tsx', 'utf8');
vetDash = vetDash.replace(/'use client';\n/g, '');
vetDash = vetDash.replace(/"use client";\n/g, '');
vetDash = "'use client';\n" + vetDash;
fs.writeFileSync('app/vet/dashboard/page.tsx', vetDash, 'utf8');

let dashboard = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
dashboard = dashboard.replace(/'use client';\n/g, '');
dashboard = dashboard.replace(/"use client";\n/g, '');
dashboard = "'use client';\n" + dashboard;
fs.writeFileSync('app/dashboard/page.tsx', dashboard, 'utf8');

let chatUi = fs.readFileSync('app/components/VetChatInterface.tsx', 'utf8');
chatUi = chatUi.replace(/'use client';\n/g, '');
chatUi = chatUi.replace(/"use client";\n/g, '');
chatUi = "'use client';\n" + chatUi;
fs.writeFileSync('app/components/VetChatInterface.tsx', chatUi, 'utf8');
