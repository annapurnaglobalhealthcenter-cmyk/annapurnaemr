const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setup() {
  try {
    console.log('1. Creating admin@annapurna.com user...');
    let { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@annapurna.com',
      password: 'Password123!',
      email_confirm: true
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        console.log('User already exists, fetching...');
      } else {
        throw createError;
      }
    }

    // Get user id
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const adminUser = usersData.users.find(u => u.email === 'admin@annapurna.com');
    
    if (!adminUser) throw new Error("Could not find admin user after creation");
    
    console.log('2. Setting user_profile role to SuperAdmin...');
    // Upsert the user profile in case the trigger missed it or it needs updating
    await supabase.from('user_profiles').upsert({
      id: adminUser.id,
      email: 'admin@annapurna.com',
      first_name: 'System',
      last_name: 'Administrator',
      role: 'SuperAdmin'
    });

    console.log('3. Assigning SuperAdmin to user_roles...');
    const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'SuperAdmin').single();
    
    if (roleData) {
      await supabase.from('user_roles').upsert({
        user_id: adminUser.id,
        role_id: roleData.id
      });
      console.log('Success: All permissions granted!');
    } else {
      console.log('Warning: SuperAdmin role not found in roles table. Did migrations run?');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

setup();
