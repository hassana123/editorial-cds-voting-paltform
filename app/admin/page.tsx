//'use cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './admin-dashboard'
import type { Position, ContestantApplication, SystemSettings, Vote, CDSMember } from '@/lib/types'

export default async function AdminPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/admin/login')
  }
  
  const [
    { data: settings },
    { data: positions },
    { data: applications },
    { data: votes },
    { data: members }
  ] = await Promise.all([
    supabase.from('system_settings').select('*').single(),
    supabase.from('positions').select('*').order('election_order', { ascending: true }),
    supabase.from('contestant_applications').select('*, position:positions(*)').order('created_at', { ascending: false }),
    supabase.from('votes').select('*'),
    supabase.from('cds_members').select('*').order('full_name', { ascending: true })
  ])
  
  return (
    <AdminDashboard
      initialSettings={(settings as SystemSettings) || { id: 1, applications_open: false, voting_open: false, updated_at: new Date().toISOString() }}
      positions={(positions as Position[]) || []}
      applications={(applications as ContestantApplication[]) || []}
      votes={(votes as Vote[]) || []}
      members={(members as CDSMember[]) || []}
      userEmail={user.email || ''}
    />
  )
}
