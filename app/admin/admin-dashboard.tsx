'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Loader2, CheckCircle2, XCircle, Users, Vote, FileText, Settings, 
  BarChart3, Eye, UserPlus, RefreshCw, Download, Upload, Trash2, LogOut, Home
} from 'lucide-react'
import Link from 'next/link'
import type { Position, ContestantApplication, SystemSettings, Vote as VoteType, CDSMember } from '@/lib/types'
import Image from 'next/image'

interface AdminDashboardProps {
  initialSettings: SystemSettings
  positions: Position[]
  applications: ContestantApplication[]
  votes: VoteType[]
  members: CDSMember[]
  userEmail: string
}

export function AdminDashboard({ 
  initialSettings, 
  positions, 
  applications: initialApplications, 
  votes,
  members: initialMembers,
  userEmail
}: AdminDashboardProps) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [applications, setApplications] = useState(initialApplications)
  const [members, setMembers] = useState(initialMembers)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<ContestantApplication | null>(null)
  
  // New member form
  const [newMember, setNewMember] = useState({ state_code: '', full_name: '', batch: '' })
  const [addingMember, setAddingMember] = useState(false)
  const [bulkUpload, setBulkUpload] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  // Calculate statistics
  const stats = {
    totalMembers: members.length,
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => a.status === 'pending').length,
    approvedCandidates: applications.filter(a => a.status === 'approved').length,
    totalVotes: votes.length,
    uniqueVoters: new Set(votes.map(v => v.voter_state_code_hash)).size
  }

  // Vote counts by position and candidate
  const voteCountsByPosition = positions.map(position => {
    const positionVotes = votes.filter(v => v.position_id === position.id)
    const candidateCounts = applications
      .filter(a => a.position_id === position.id && a.status === 'approved')
      .map(candidate => ({
        candidate,
        votes: positionVotes.filter(v => v.candidate_id === candidate.id).length
      }))
      .sort((a, b) => b.votes - a.votes)
    
    return {
      position,
      totalVotes: positionVotes.length,
      candidates: candidateCounts
    }
  })

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
      setError('Failed to update settings')
    } else {
      setSettings(prev => ({ ...prev, ...updates }))
    }

    setUpdating(false)
    router.refresh()
  }

  const updateApplicationStatus = async (appId: string, status: 'approved' | 'rejected') => {
    setUpdating(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase
      .from('contestant_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', appId)

    if (error) {
      setError('Failed to update application status')
    } else {
      setApplications(prev => 
        prev.map(app => app.id === appId ? { ...app, status } : app)
      )
      setSelectedApp(null)
    }

    setUpdating(false)
    router.refresh()
  }

  const addMember = async () => {
    if (!newMember.state_code || !newMember.full_name || !newMember.batch) {
      setError('All fields are required')
      return
    }

    setAddingMember(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase
      .from('cds_members')
      .insert({
        state_code: newMember.state_code.toUpperCase(),
        full_name: newMember.full_name,
        batch: newMember.batch
      })

    if (error) {
      if (error.code === '23505') {
        setError('Member with this state code already exists')
      } else {
        setError('Failed to add member')
      }
    } else {
      setMembers(prev => [...prev, { 
        ...newMember, 
        state_code: newMember.state_code.toUpperCase(),
        eligible: true, 
        created_at: new Date().toISOString() 
      }])
      setNewMember({ state_code: '', full_name: '', batch: '' })
    }

    setAddingMember(false)
    router.refresh()
  }

  const bulkAddMembers = async () => {
    if (!bulkUpload.trim()) {
      setError('Please enter member data')
      return
    }

    setAddingMember(true)
    setError(null)

    const lines = bulkUpload.trim().split('\n')
    const membersToAdd: Omit<CDSMember, 'created_at'>[] = []

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 3) {
        membersToAdd.push({
          state_code: parts[0].toUpperCase(),
          full_name: parts[1],
          batch: parts[2],
          eligible: true
        })
      }
    }

    if (membersToAdd.length === 0) {
      setError('No valid entries found. Format: STATE_CODE, Full Name, Batch')
      setAddingMember(false)
      return
    }

    const supabase = createClient()

    const { error, data } = await supabase
      .from('cds_members')
      .upsert(membersToAdd, { onConflict: 'state_code' })
      .select()

    if (error) {
      setError('Failed to add some members')
    } else {
      setBulkUpload('')
      router.refresh()
      // Refresh the members list
      const { data: refreshedMembers } = await supabase
        .from('cds_members')
        .select('*')
        .order('full_name', { ascending: true })
      if (refreshedMembers) {
        setMembers(refreshedMembers)
      }
    }

    setAddingMember(false)
  }

  const deleteMember = async (stateCode: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('cds_members')
      .delete()
      .eq('state_code', stateCode)

    if (!error) {
      setMembers(prev => prev.filter(m => m.state_code !== stateCode))
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Signed in as {userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="bg-transparent">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            disabled={signingOut}
            className="bg-transparent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">{stats.totalMembers}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">CDS Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">{stats.totalApplications}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-yellow-500" />
              <span className="text-2xl font-bold text-foreground">{stats.pendingApplications}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stats.approvedCandidates}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">{stats.totalVotes}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Votes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">{stats.uniqueVoters}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Voted</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Applications</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Election Control Panel</CardTitle>
              <CardDescription>
                Control the election phases. Only one phase can be active at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
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

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
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
                  Current Status: {settings.applications_open ? 'Applications are OPEN' : settings.voting_open ? 'Voting is OPEN' : 'Election is CLOSED'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Contestant Applications</CardTitle>
              <CardDescription>
                Review and approve/reject contestant applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No applications yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>State Code</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
                              <Image
                                src={app.image_url || '/placeholder.svg'}
                                alt={app.full_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{app.full_name}</TableCell>
                          <TableCell className="font-mono text-sm">{app.state_code}</TableCell>
                          <TableCell>{app.position?.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                app.status === 'approved' ? 'default' : 
                                app.status === 'rejected' ? 'destructive' : 
                                'secondary'
                              }
                            >
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedApp(app)}
                                  className="bg-transparent"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Application Review</DialogTitle>
                                  <DialogDescription>
                                    Review the contestant's application details
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedApp && (
                                  <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                                        <Image
                                          src={selectedApp.image_url || '/placeholder.svg'}
                                          alt={selectedApp.full_name}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-lg text-foreground">{selectedApp.full_name}</h3>
                                        <p className="text-muted-foreground font-mono">{selectedApp.state_code}</p>
                                        <Badge variant="outline" className="mt-2 bg-transparent">
                                          {selectedApp.position?.name}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Email</p>
                                        <p className="text-foreground">{selectedApp.email}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Phone</p>
                                        <p className="text-foreground">{selectedApp.phone}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Batch</p>
                                        <p className="text-foreground">{selectedApp.batch}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Attendance Rating</p>
                                        <p className="text-foreground">{selectedApp.attendance_rating}/10</p>
                                      </div>
                                    </div>

                                    <div>
                                      <p className="text-muted-foreground text-sm mb-1">Campaign Mantra</p>
                                      <p className="text-foreground italic">"{selectedApp.mantra}"</p>
                                    </div>

                                    <div>
                                      <p className="text-muted-foreground text-sm mb-1">Why this position?</p>
                                      <p className="text-foreground text-sm">{selectedApp.reason}</p>
                                    </div>

                                    <DialogFooter className="gap-2 sm:gap-0">
                                      {selectedApp.status === 'pending' && (
                                        <>
                                          <Button
                                            variant="destructive"
                                            onClick={() => updateApplicationStatus(selectedApp.id, 'rejected')}
                                            disabled={updating}
                                          >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Reject
                                          </Button>
                                          <Button
                                            onClick={() => updateApplicationStatus(selectedApp.id, 'approved')}
                                            disabled={updating}
                                          >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Approve
                                          </Button>
                                        </>
                                      )}
                                      {selectedApp.status !== 'pending' && (
                                        <Badge 
                                          variant={selectedApp.status === 'approved' ? 'default' : 'destructive'}
                                          className="text-sm"
                                        >
                                          {selectedApp.status === 'approved' ? 'Approved' : 'Rejected'}
                                        </Badge>
                                      )}
                                    </DialogFooter>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <div className="space-y-6">
            {voteCountsByPosition.map(({ position, totalVotes, candidates }) => (
              <Card key={position.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{position.name}</CardTitle>
                    <Badge variant="outline" className="bg-transparent">{totalVotes} votes</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {candidates.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No approved candidates</p>
                  ) : (
                    <div className="space-y-3">
                      {candidates.map((item, index) => {
                        const percentage = totalVotes > 0 ? (item.votes / totalVotes) * 100 : 0
                        return (
                          <div key={item.candidate.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {index === 0 && totalVotes > 0 && (
                                  <Badge className="text-xs">Leading</Badge>
                                )}
                                <span className="font-medium text-foreground">{item.candidate.full_name}</span>
                              </div>
                              <span className="text-muted-foreground">
                                {item.votes} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Add Member Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Add CDS Member</CardTitle>
                <CardDescription>
                  Add individual member or bulk upload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="state_code">State Code</Label>
                  <Input
                    id="state_code"
                    placeholder="KN/24A/1234"
                    value={newMember.state_code}
                    onChange={(e) => setNewMember(prev => ({ ...prev, state_code: e.target.value }))}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Input
                    id="batch"
                    placeholder="2024 Batch A"
                    value={newMember.batch}
                    onChange={(e) => setNewMember(prev => ({ ...prev, batch: e.target.value }))}
                  />
                </div>
                <Button onClick={addMember} disabled={addingMember} className="w-full">
                  {addingMember ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Add Member
                </Button>

                <div className="border-t border-border pt-4 mt-4">
                  <Label htmlFor="bulk">Bulk Upload (CSV format)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Format: STATE_CODE, Full Name, Batch</p>
                  <textarea
                    id="bulk"
                    className="w-full h-24 p-2 text-sm border border-input rounded-md bg-background text-foreground"
                    placeholder="KN/24A/1234, John Doe, 2024 Batch A&#10;KN/24A/1235, Jane Doe, 2024 Batch A"
                    value={bulkUpload}
                    onChange={(e) => setBulkUpload(e.target.value)}
                  />
                  <Button 
                    onClick={bulkAddMembers} 
                    disabled={addingMember} 
                    variant="outline" 
                    className="w-full mt-2 bg-transparent"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">CDS Members ({members.length})</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.refresh()}
                    className="bg-transparent"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No members added yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>State Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.state_code}>
                            <TableCell className="font-mono text-sm">{member.state_code}</TableCell>
                            <TableCell>{member.full_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{member.batch}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMember(member.state_code)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
