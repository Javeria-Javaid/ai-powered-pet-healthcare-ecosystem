const fs = require('fs');
let content = fs.readFileSync('app/api/conversations/route.ts', 'utf8');
content = content.replace('let conversations = [];', 'let conversations: any[] = [];');
fs.writeFileSync('app/api/conversations/route.ts', content);
