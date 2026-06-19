const fs = require('fs');
const lines = fs.readFileSync('src/components/settings/chatbot-config.tsx', 'utf8').split('\n');
for (let i = 23; i <= 28; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
