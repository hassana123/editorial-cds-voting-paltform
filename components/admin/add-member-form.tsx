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

interface AddMemberFormProps {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function AddMemberForm({ onSuccess, onError }: AddMemberFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    state_code: '',
    full_name: '',
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

      // Check if state code exists in electoral committee
      const { data: committeeCheck } = await supabase
        .from('electoral_committee')
        .select('state_code')
        .eq('state_code', formData.state_code.toUpperCase())
        .single()

      const isCommitteeMember = !!committeeCheck

      const { error } = await supabase
        .from('cds_members')
        .insert({
          state_code: formData.state_code.toUpperCase(),
          full_name: formData.full_name,
          batch: formData.batch,
          is_electoral_committee: isCommitteeMember,
          eligible: !isCommitteeMember,
          ineligible_reason: isCommitteeMember ? 'Electoral committee member' : null
        })

      if (error) {
        if (error.code === '23505') {
          onError('Member with this state code already exists')
        } else {
          onError('Failed to add member')
        }
      } else {
        onSuccess(`Member ${formData.full_name} added successfully!`)
        setFormData({ state_code: '', full_name: '', batch: '' })
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
        <CardTitle className="text-base">Add Individual Member</CardTitle>
        <CardDescription>Add a single CDS member to the system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="state_code">State Code *</Label>
            <Input
              id="state_code"
              placeholder="KN/24A/1234"
              value={formData.state_code}
              onChange={(e) => setFormData(prev => ({ ...prev, state_code: e.target.value }))}
              className="uppercase"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch">Batch *</Label>
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

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" />Add Member</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}