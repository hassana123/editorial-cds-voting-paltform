'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, UserPlus, Trash2, Shield, AlertCircle, Users } from 'lucide-react'
import { SearchBar, Pagination } from '../shared-ui'
import type { ElectoralCommittee, Position } from '@/lib/types'
import { toast } from 'sonner'

interface CommitteeTabProps {
  initialCommittee: ElectoralCommittee[]
  positions: Position[]
}

export function CommitteeTab({ initialCommittee, positions }: CommitteeTabProps) {
  const router = useRouter()
  const [committee, setCommittee] = useState(initialCommittee)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [newCommittee, setNewCommittee] = useState({ 
    state_code: '', 
    full_name: '', 
    role: 'member' 
  })
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Role options: positions + "member"
  const roleOptions = [
    { value: 'member', label: 'Committee Member' },
    ...positions.map(p => ({ value: p.name, label: p.name }))
  ]

  // Filter committee
  const filteredCommittee = useMemo(() => {
    return committee.filter(c =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.state_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [committee, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredCommittee.length / itemsPerPage)
  const paginatedCommittee = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCommittee.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCommittee, currentPage, itemsPerPage])

  const handleAddCommittee = async () => {
    if (!newCommittee.state_code || !newCommittee.full_name || !newCommittee.role) {
      toast.error('All fields are required')
      return
    }

    setAdding(true)
    const supabase = createClient()

    const { data, error } = await supabase.rpc('add_electoral_committee', {
      p_state_code: newCommittee.state_code.toUpperCase(),
      p_full_name: newCommittee.full_name,
      p_role: newCommittee.role
    })

    if (error || !data?.success) {
      toast.error(data?.error || 'Failed to add committee member')
    } else {
      toast.success(`✓ ${newCommittee.full_name} added to committee`)
      setNewCommittee({ state_code: '', full_name: '', role: 'member' })
      setShowAddDialog(false)
      router.refresh()

      // Refresh committee list
      const { data: refreshed } = await supabase
        .from('electoral_committee')
        .select('*')
        .order('full_name', { ascending: true })
      if (refreshed) setCommittee(refreshed)
    }
    setAdding(false)
  }

  const handleRemoveCommittee = async (stateCode: string, id: string) => {
    setDeletingId(id)
    const supabase = createClient()

    const { data, error } = await supabase.rpc('remove_electoral_committee', {
      p_state_code: stateCode
    })

    if (error || !data?.success) {
      toast.error('Failed to remove committee member')
    } else {
      toast.success('Committee member removed successfully')
      setCommittee(prev => prev.filter(c => c.id !== id))
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Add Committee Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Appoint Committee
          </CardTitle>
          <CardDescription>Grant committee privileges to a member</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-500/20 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-xs">
              Committee members cannot vote. They will be automatically marked as ineligible.
            </AlertDescription>
          </Alert>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Committee Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Appoint Committee Member</DialogTitle>
                <DialogDescription>
                  Add a CDS member to the electoral committee
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>State Code *</Label>
                  <Input
                    placeholder="KN/24A/..."
                    value={newCommittee.state_code}
                    onChange={e => setNewCommittee({ ...newCommittee, state_code: e.target.value })}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    If not in members list, will be added automatically
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Full Name"
                    value={newCommittee.full_name}
                    onChange={e => setNewCommittee({ ...newCommittee, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={newCommittee.role}
                    onValueChange={value => setNewCommittee({ ...newCommittee, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddCommittee} disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Appoint Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Committee</span>
              <Badge variant="secondary">{committee.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Committee List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base">Electoral Committee</CardTitle>
              <CardDescription>Manage committee members ({filteredCommittee.length})</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <SearchBar
                value={searchTerm}
                onChange={(value) => {
                  setSearchTerm(value)
                  setCurrentPage(1)
                }}
                placeholder="Search committee..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedCommittee.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No committee members found' : 'No committee members appointed yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>State Code</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCommittee.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="font-mono text-sm">{c.state_code}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {c.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deletingId === c.id}
                              >
                                {deletingId === c.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Remove Committee Member</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to remove <strong>{c.full_name}</strong> from the committee?
                                  They will be marked as eligible to vote again.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleRemoveCommittee(c.state_code, c.id)}
                                >
                                  Remove Member
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value)
                  setCurrentPage(1)
                }}
                totalItems={filteredCommittee.length}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}