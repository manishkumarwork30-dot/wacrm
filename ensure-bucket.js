require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function ensureBucket() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.storage.getBucket('documents');
  if (error) {
    console.log("Bucket doesn't exist or error:", error);
    const { data: createData, error: createError } = await supabase.storage.createBucket('documents', { public: true });
    if (createError) {
      console.error("Failed to create bucket:", createError);
    } else {
      console.log("Bucket created successfully:", createData);
    }
  } else {
    console.log("Bucket already exists:", data);
  }
}

ensureBucket().catch(console.error);
