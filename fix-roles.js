const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false }});

async function setup() {
  try {
    // 1. Ensure Role Exists
    console.log('Ensuring SuperAdmin role exists...');
    const { data: roleInsert, error: roleError } = await supabase.from('roles').upsert({
      name: 'SuperAdmin',
      description: 'System Administrator'
    }, { onConflict: 'name' }).select('id').single();
    
    if (roleError) throw roleError;
    const roleId = roleInsert.id;

    // 2. Fetch User
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const adminUser = usersData.users.find(u => u.email === 'admin@annapurna.com');
    if (!adminUser) throw new Error("Could not find admin user");

    // 3. Upsert Role Profile
    await supabase.from('user_profiles').upsert({
      id: adminUser.id,
      email: 'admin@annapurna.com',
      first_name: 'System',
      last_name: 'Administrator',
      role: 'SuperAdmin'
    });

    // 4. Upsert User Role
    await supabase.from('user_roles').upsert({
      user_id: adminUser.id,
      role_id: roleId
    });

    console.log('Successfully configured SuperAdmin permissions!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
setup();
