//'use cache'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApplicationForm } from './application-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, FileText } from 'lucide-react'
import type { Position, SystemSettings } from '@/lib/types'

export default async function ApplyPage() {
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .single()
  
  const systemSettings = settings as SystemSettings | null
  
  if (!systemSettings?.applications_open) {
    redirect('/')
  }
  
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('active', true)
    .order('election_order', { ascending: true })
  
  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Contestant Application
          </h1>
          <p className="text-muted-foreground">
            Apply for an executive position in the Editorial CDS
          </p>
        </div>

        {/* Application Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Application Form</CardTitle>
            <CardDescription>
              Fill in your details accurately. All information will be verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-foreground">
                Your application will be reviewed by the electoral committee. 
                Only approved candidates will appear on the ballot.
              </AlertDescription>
            </Alert>
            
            <ApplicationForm positions={(positions as Position[]) || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
