//'use cache'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VotingInterface } from './voting-interface'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Vote } from 'lucide-react'
import type { Position, ContestantApplication, SystemSettings } from '@/lib/types'

export default async function VotePage() {
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .single()
  
  const systemSettings = settings as SystemSettings | null
  
  if (!systemSettings?.voting_open) {
    redirect('/')
  }
  
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('active', true)
    .order('election_order', { ascending: true })
  
  const { data: candidates } = await supabase
    .from('contestant_applications')
    .select('*, position:positions(*)')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
  
  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Vote className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Cast Your Vote
          </h1>
          <p className="text-muted-foreground">
            Choose your leaders for Editorial CDS 2025/2026
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-primary/20 bg-primary/5 max-w-xl mx-auto">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-foreground">
            Your vote is anonymous and secure. You can only vote once per position. Make your choice count!
          </AlertDescription>
        </Alert>
        
        {/* Voting Interface */}
        <VotingInterface 
          positions={(positions as Position[]) || []} 
          candidates={(candidates as ContestantApplication[]) || []} 
        />
      </div>
    </div>
  )
}
