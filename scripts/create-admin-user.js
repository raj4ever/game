// Script to create admin user in Supabase
// Run this once: node scripts/create-admin-user.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (get from Supabase Dashboard > Settings > API > service_role key)');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('🔄 Creating admin user...');
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'raj4everwap@gmail.com',
      password: 'R@J4ever',
      email_confirm: true, // Auto-confirm email
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ User already exists!');
        return;
      }
      throw error;
    }

    console.log('✅ Admin user created successfully!');
    console.log('   Email: raj4everwap@gmail.com');
    console.log('   Password: R@J4ever');
    console.log('   User ID:', data.user.id);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();

