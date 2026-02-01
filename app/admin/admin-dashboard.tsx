'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, Vote, FileText, Settings, BarChart3, UserPlus, LogOut, Home, Shield
} from 'lucide-react'
import Link from 'next/link'
import type {
  Position,
  ContestantApplication,
  SystemSettings,
  Vote as VoteType,
  CDSMember,
  ElectoralCommittee,
} from '@/lib/types'

// Import modular tabs
import { SettingsTab } from '@/components/admin/settings-tab'
import { MembersTab } from '@/components/admin/members-tab'
import { CommitteeTab } from '@/components/admin/committee-tab'
import { ApplicationsTab } from '@/components/admin/application-tab'
import { ResultsTab } from '@/components/admin/result-tab'
import { Toaster } from 'sonner'

interface AdminDashboardProps {
  initialSettings: SystemSettings
  positions: Position[]
  applications: ContestantApplication[]
  votes: VoteType[]
  members: CDSMember[]
  committee: ElectoralCommittee[]
  userEmail: string
  userRole: string
  userName?: string
}

export function AdminDashboard({
  initialSettings,
  positions,
  applications: initialApplications,
  votes,
  members: initialMembers,
  committee: initialCommittee,
  userEmail,
  userRole,
  userName,
}: AdminDashboardProps) {
  const router = useRouter()
  const isSuperAdmin = userRole === 'admin'
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
    totalMembers: initialMembers.length,
    totalApplications: initialApplications.length,
    pendingApplications: initialApplications.filter(a => a.status === 'pending').length,
    approvedCandidates: initialApplications.filter(a => a.status === 'approved').length,
    totalVotes: votes.length,
    uniqueVoters: new Set(votes.map(v => v.voter_state_code_hash)).size,
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            {/* Admin Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {userName?.charAt(0) || userEmail.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground">
                      {userName || 'Administrator'}
                    </h1>
                    <Badge
                      variant={isSuperAdmin ? 'default' : 'secondary'}
                      className="text-[10px] uppercase"
                    >
                      {isSuperAdmin ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        'Committee'
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
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

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.totalMembers}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">CDS Members</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.totalApplications}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Applications</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-yellow-500" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.pendingApplications}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.approvedCandidates}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Approved</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Vote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.totalVotes}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total Votes</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.uniqueVoters}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Voted</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="settings" className="space-y-4">
              <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-5' : 'grid-cols-4'} max-w-2xl`}>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
                {isSuperAdmin && (
                  <TabsTrigger value="committee" className="gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Committee</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="members" className="gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Members</span>
                </TabsTrigger>
                <TabsTrigger value="applications" className="gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Applications</span>
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Results</span>
                </TabsTrigger>
              </TabsList>

              {/* Settings Tab */}
              <TabsContent value="settings">
                <SettingsTab initialSettings={initialSettings} />
              </TabsContent>

              {/* Committee Tab (Admin Only) */}
              {isSuperAdmin && (
                <TabsContent value="committee">
                  <CommitteeTab initialCommittee={initialCommittee} positions={positions} />
                </TabsContent>
              )}

              {/* Members Tab */}
              <TabsContent value="members">
                <MembersTab initialMembers={initialMembers} />
              </TabsContent>

              {/* Applications Tab */}
              <TabsContent value="applications">
                <ApplicationsTab initialApplications={initialApplications} />
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results">
                <ResultsTab
                  positions={positions}
                  applications={initialApplications}
                  votes={votes}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  )
}