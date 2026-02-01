import { createClient } from '@/lib/supabase/client'

export async function getCurrentRole() {
  const supabase = createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  return user?.user_metadata?.role || 'user'
}

export async function isSuperAdmin() {
  return (await getCurrentRole()) === 'superadmin'
}

export async function isCommittee() {
  const role = await getCurrentRole()
  return role === 'committee' || role === 'superadmin'
}
