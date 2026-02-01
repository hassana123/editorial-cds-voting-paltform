'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, Vote, AlertCircle } from 'lucide-react'
import type { SystemSettings } from '@/lib/types'

interface SettingsTabProps {
  initialSettings: SystemSettings
}

export function SettingsTab({ initialSettings }: SettingsTabProps) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSetting = async (key: 'applications_open' | 'voting_open') => {
    setUpdating(true)
    setError(null)

    const supabase = createClient()
    const newValue = !settings[key]

    // If opening voting, close applications
    const updates: Partial<SystemSettings> = { [key]: newValue }
    if (key === 'voting_open' && newValue) {
      updates.applications_open = false
    }
    // If opening applications, close voting
    if (key === 'applications_open' && newValue) {
      updates.voting_open = false
    }

    const { error } = await supabase
      .from('system_settings')
      .update(updates)
      .eq('id', 1)

    if (error) {
      setError('Failed to update settings: ' + error.message)
    } else {
      setSettings(prev => ({ ...prev, ...updates }))
      router.refresh()
    }

    setUpdating(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Election Control Panel</CardTitle>
        <CardDescription>
          Control the election phases. Only one phase can be active at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Applications Phase</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Allow contestants to submit applications
            </p>
          </div>
          <Switch
            checked={settings.applications_open}
            onCheckedChange={() => toggleSetting('applications_open')}
            disabled={updating}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Voting Phase</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Allow CDS members to cast their votes
            </p>
          </div>
          <Switch
            checked={settings.voting_open}
            onCheckedChange={() => toggleSetting('voting_open')}
            disabled={updating}
          />
        </div>

        <Alert className="border-primary/20 bg-primary/5">
          <AlertDescription className="text-foreground text-sm">
            <strong>Current Status:</strong> {
              settings.applications_open 
                ? '📝 Applications are OPEN' 
                : settings.voting_open 
                  ? '🗳️ Voting is OPEN' 
                  : '🔒 Election is CLOSED'
            }
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}