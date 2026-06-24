import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envLocalPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    const { data: templates, error } = await supabase
      .from('message_templates')
      .select('*')
      .neq('name', '__chatbot_config')
      .neq('name', '__document_config');
    
    if (error) {
      console.error("Error fetching templates:", error);
    } else {
      console.log("Templates in DB:");
      templates.forEach(t => {
        console.log(`Name: ${t.name}, Status: ${t.status}, Category: ${t.category}`);
      });
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
