'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, UserPlus } from 'lucide-react'

interface AddCommitteeFormProps {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function AddCommitteeForm({ onSuccess, onError }: AddCommitteeFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    state_code: '',
    full_name: '',
    role: 'member',
    batch: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.state_code || !formData.full_name || !formData.batch) {
      onError('All fields are required')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc('add_electoral_committee', {
        p_state_code: formData.state_code.toUpperCase(),
        p_full_name: formData.full_name,
        p_role: formData.role,
        p_batch: formData.batch
      })

      if (error) {
        if (error.message.includes('already exists')) {
          onError('This member is already in the electoral committee')
        } else {
          onError(error.message || 'Failed to add committee member')
        }
      } else {
        onSuccess(`${formData.full_name} added to electoral committee successfully!`)
        setFormData({ state_code: '', full_name: '', role: 'member', batch: '' })
        router.refresh()
      }
    } catch (err) {
      onError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appoint Committee Member</CardTitle>
        <CardDescription>Grant committee privileges to a member (Admin only)</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="committee_state_code">State Code *</Label>
            <Input
              id="committee_state_code"
              placeholder="KN/24A/1234"
              value={formData.state_code}
              onChange={(e) => setFormData(prev => ({ ...prev, state_code: e.target.value }))}
              className="uppercase"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="committee_full_name">Full Name *</Label>
            <Input
              id="committee_full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="committee_batch">Batch *</Label>
            <Select
              value={formData.batch}
              onValueChange={(value) => setFormData(prev => ({ ...prev, batch: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Batch A">Batch A</SelectItem>
                <SelectItem value="Batch B">Batch B</SelectItem>
                <SelectItem value="Batch C">Batch C</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="committee_role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Committee Member</SelectItem>
                <SelectItem value="secretary">Secretary</SelectItem>
                <SelectItem value="chairman">Chairman</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Appointing...</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" />Appoint Member</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}