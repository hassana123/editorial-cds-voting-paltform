// app/admin/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './admin-dashboard'
import { log } from 'console'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/admin/login')

  const role = user.user_metadata?.role || 'user'
  console.log(role);
  
  const userName = user.user_metadata?.full_name || 'Administrator'
  //const isSuperAdmin = role === 'admin' // or 'superadmin' based on your SQL

  const [
    { data: settings },
    { data: positions },
    { data: applications },
    { data: votes },
    { data: members },
    { data: committee }, // Fetch committee list
  ] = await Promise.all([
    supabase.from('system_settings').select('*').single(),
    supabase.from('positions').select('*').order('election_order', { ascending: true }),
    supabase.from('contestant_applications').select('*, position:positions(*)').order('created_at', { ascending: false }),
    supabase.from('votes').select('*'),
    supabase.from('cds_members').select('*').order('full_name', { ascending: true }),
    supabase.from('electoral_committee').select('*').order('full_name', { ascending: true })
  ])
  console.log("hello", members, committee, members, votes, applications);
  console.log();
  
  
  return (
    <AdminDashboard
      initialSettings={settings}
      positions={positions || []}
      applications={applications || []}
      votes={votes || []}
      members={members || []}
      committee={committee || []} // Pass to dashboard
      userEmail={user.email || ''}
      userRole={role}
      userName={userName}
    />
  )
}