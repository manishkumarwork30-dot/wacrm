const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envLocalPath = path.join(__dirname, '.env.local');
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
    console.log("Listing tables...");
    const { data, error } = await supabase.rpc('get_tables'); // Or query pg_catalog
    if (error) {
      // Fallback: query pg_catalog using a simple query
      const { data: tables, error: sqlErr } = await supabase.from('_sql').select('*').limit(1).catch(() => ({data: null, error: true}));
      
      // Let's run a query via pg_tables
      const { data: pgTables, error: pgErr } = await supabase
        .rpc('admin_sql', { query: "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';" });
      
      if (pgErr) {
        console.error("RPC failed:", pgErr);
        // Let's try running direct queries on pg_tables if possible, otherwise list schemas
        return;
      }
      console.log("Tables:", pgTables);
    } else {
      console.log("Tables:", data);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

// Let's write a query using supabase REST interface for metadata or catalog if exposed
async function runQuery() {
  // Let's try executing a SQL function if it's there
  try {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('id')
      .limit(1);
    console.log("Supabase connection ok.");
  } catch (e) {
    console.error("Connection failed:", e);
  }
}

runQuery();
