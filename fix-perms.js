const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false }});

async function fix() {
  // 1. Get SuperAdmin role id
  const { data: saRole } = await supabase.from('roles').select('id').eq('name', 'SuperAdmin').single();
  if (!saRole) return console.log('SuperAdmin role not found');
  
  // 2. Get all permissions
  const { data: perms } = await supabase.from('permissions').select('id');
  
  // 3. Insert all permissions for SuperAdmin
  const rolePerms = perms.map(p => ({
    role_id: saRole.id,
    permission_id: p.id
  }));
  
  await supabase.from('role_permissions').upsert(rolePerms, { onConflict: 'role_id,permission_id' });
  
  console.log('Granted all permissions to SuperAdmin!');
}
fix();
