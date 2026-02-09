'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, UserPlus, Upload, Trash2, RefreshCw, Users, CheckCircle2, XCircle, FileUp } from 'lucide-react'
import { SearchBar, Pagination } from '../shared-ui'
import type { CDSMember } from '@/lib/types'
import { toast } from 'sonner'

interface MembersTabProps {
  initialMembers: CDSMember[]
}

export function MembersTab({ initialMembers }: MembersTabProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [newMember, setNewMember] = useState({ state_code: '', full_name: '', batch: '' })
  const [bulkUpload, setBulkUpload] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [addingMember, setAddingMember] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)

  // Filter and search members
  const filteredMembers = useMemo(() => {
    return members.filter(member =>
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.state_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.batch.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [members, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredMembers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMembers, currentPage, itemsPerPage])

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const addMember = async () => {
    if (!newMember.state_code || !newMember.full_name || !newMember.batch) {
      toast.error('All fields are required')
      return
    }

    setAddingMember(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('cds_members')
      .insert({
        state_code: newMember.state_code.toUpperCase(),
        full_name: newMember.full_name,
        batch: newMember.batch
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        toast.error('Member with this state code already exists')
      } else {
        toast.error('Failed to add member: ' + error.message)
      }
    } else {
      setMembers(prev => [data, ...prev])
      setNewMember({ state_code: '', full_name: '', batch: '' })
      setShowAddDialog(false)
      toast.success(`✓ ${data.full_name} added successfully`)
      router.refresh()
    }

    setAddingMember(false)
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setBulkUpload(text)
    }
    reader.readAsText(file)
  }

  const bulkAddMembers = async () => {
    if (!bulkUpload.trim()) {
      toast.error('Please enter member data or upload a CSV file')
      return
    }

    setAddingMember(true)

    const lines = bulkUpload.trim().split('\n')
    const membersToAdd: { state_code: string; full_name: string; batch: string }[] = []

    // Skip header row if it exists
    const startIndex = lines[0].toLowerCase().includes('state') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
        membersToAdd.push({
          state_code: parts[0].toUpperCase(),
          full_name: parts[1],
          batch: parts[2]
        })
      }
    }

    if (membersToAdd.length === 0) {
      toast.error('No valid entries found. Format: STATE_CODE, Full Name, Batch')
      setAddingMember(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('cds_members')
      .upsert(membersToAdd, { onConflict: 'state_code' })
      .select()

    if (error) {
      toast.error('Failed to add some members: ' + error.message)
    } else {
      setBulkUpload('')
      setCsvFile(null)
      setShowBulkDialog(false)
      toast.success(`✓ ${data.length} members added/updated successfully`)
      
      // Refresh members list
      const { data: refreshedMembers } = await supabase
        .from('cds_members')
        .select('*')
        .order('full_name', { ascending: true })
      if (refreshedMembers) {
        setMembers(refreshedMembers)
      }
      router.refresh()
    }

    setAddingMember(false)
  }

  const deleteMember = async (stateCode: string) => {
    setDeletingId(stateCode)
    const supabase = createClient()

    const { error } = await supabase
      .from('cds_members')
      .delete()
      .eq('state_code', stateCode)

    if (error) {
      toast.error('Failed to delete member: ' + error.message)
    } else {
      setMembers(prev => prev.filter(m => m.state_code !== stateCode))
      toast.success('Member deleted successfully')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Quick Actions Sidebar */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Add or import CDS members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="default">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Single Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>Add a CDS member to the registry</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="state_code">State Code *</Label>
                  <Input
                    id="state_code"
                    placeholder="KN/24A/1234"
                    value={newMember.state_code}
                    onChange={(e) => setNewMember(prev => ({ ...prev, state_code: e.target.value }))}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch *</Label>
                  <Input
                    id="batch"
                    placeholder="2024 Batch A"
                    value={newMember.batch}
                    onChange={(e) => setNewMember(prev => ({ ...prev, batch: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={addMember} disabled={addingMember}>
                  {addingMember ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Upload Members</DialogTitle>
                <DialogDescription>Upload a CSV file or paste data manually</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload CSV File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="flex-1"
                    />
                    {csvFile && (
                      <Badge variant="outline" className="shrink-0">
                        <FileUp className="w-3 h-3 mr-1" />
                        {csvFile.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CSV format: STATE_CODE, Full Name, Batch (header row optional)
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or paste data</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk">Manual Entry</Label>
                  <textarea
                    id="bulk"
                    className="w-full h-32 p-3 text-sm border border-input rounded-md bg-background text-foreground font-mono"
                    placeholder="KN/24A/1234, John Doe, 2024 Batch A&#10;KN/24A/1235, Jane Doe, 2024 Batch A"
                    value={bulkUpload}
                    onChange={(e) => setBulkUpload(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
                <Button onClick={bulkAddMembers} disabled={addingMember}>
                  {addingMember ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Members
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            className="w-full"
            variant="outline"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh List
          </Button>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Total Members</span>
              <Badge variant="secondary">{members.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Eligible to Vote</span>
              <Badge variant="default">{members.filter(m => m.eligible).length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base">CDS Members</CardTitle>
              <CardDescription>Manage registered members ({filteredMembers.length})</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <SearchBar
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by name, state code, or batch..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No members found matching your search' : 'No members added yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>State Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMembers.map((member) => (
                      <TableRow key={member.state_code}>
                        <TableCell className="font-mono text-sm">{member.state_code}</TableCell>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{member.batch}</TableCell>
                        <TableCell>
                          {member.is_electoral_committee ? (
                            <Badge variant="secondary" className="text-xs">
                              Committee
                            </Badge>
                          ) : member.eligible ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Eligible
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="w-3 h-3 mr-1" />
                              Ineligible
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deletingId === member.state_code}
                              >
                                {deletingId === member.state_code ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete <strong>{member.full_name}</strong>? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button variant="destructive" onClick={() => deleteMember(member.state_code)}>
                                  Delete Member
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
                totalItems={filteredMembers.length}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}