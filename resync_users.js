const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resync() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: dbUsers } = await supabase.from('usuarios').select('*');

  console.log("AUTH USERS:", authUsers.users.map(u => u.email));
  console.log("DB USERS:", dbUsers.map(u => u.username));

  // The DB user "Douglas" needs its auth email to be "douglas@lablegion.com"
  // The old auth email is "douglasvaldez@lablegion.com"
  const douglasAuthUser = authUsers.users.find(u => u.email === 'douglasvaldez@lablegion.com');
  if (douglasAuthUser) {
    console.log('Found douglas auth user, updating to douglas@lablegion.com...');
    await supabase.auth.admin.updateUserById(douglasAuthUser.id, {
      email: 'douglas@lablegion.com'
    });
    console.log('Update done.');
  } else {
    console.log('douglasvaldez@lablegion.com not found. Maybe already updated?');
  }

  // Check if any other is misaligned.
  // DB has Legion -> auth has legion@lablegion.com (OK, case insensitive match)
  // DB has Admin -> auth has admin@lablegion.com (OK)
  // DB has Vannesauria -> auth has vannesauria@lablegion.com (OK)
  // DB has Nilda -> auth has nilda@lablegion.com (OK)
}
resync();
