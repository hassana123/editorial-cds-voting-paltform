'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Eye, CheckCircle2, XCircle, FileText } from 'lucide-react'
import { SearchBar, Pagination, FilterSelect } from '../shared-ui'
import type { ContestantApplication } from '@/lib/types'
import Image from 'next/image'
import { toast } from 'sonner'

interface ApplicationsTabProps {
  initialApplications: ContestantApplication[]
}

export function ApplicationsTab({ initialApplications }: ApplicationsTabProps) {
  const router = useRouter()
  const [applications, setApplications] = useState(initialApplications)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedApp, setSelectedApp] = useState<ContestantApplication | null>(null)
  const [updating, setUpdating] = useState(false)

  // Get unique positions
  const positions = useMemo(() => {
    const uniquePositions = Array.from(
      new Set(applications.map(app => app.position?.name).filter(Boolean))
    ).sort()
    return uniquePositions.map(name => ({ label: name!, value: name! }))
  }, [applications])

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch =
        app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.state_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter
      const matchesPosition = positionFilter === 'all' || app.position?.name === positionFilter

      return matchesSearch && matchesStatus && matchesPosition
    })
  }, [applications, searchTerm, statusFilter, positionFilter])

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage)
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredApplications.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredApplications, currentPage, itemsPerPage])

  const updateApplicationStatus = async (appId: string, status: 'approved' | 'rejected') => {
    setUpdating(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('contestant_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', appId)

    if (error) {
      toast.error('Failed to update application: ' + error.message)
    } else {
      setApplications(prev =>
        prev.map(app => (app.id === appId ? { ...app, status } : app))
      )
      setSelectedApp(null)
      toast.success(
        status === 'approved'
          ? '✓ Application approved'
          : '✗ Application rejected'
      )
      router.refresh()
    }

    setUpdating(false)
  }

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle>Contestant Applications</CardTitle>
            <CardDescription>
              Review and approve/reject contestant applications ({filteredApplications.length})
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchBar
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value)
                setCurrentPage(1)
              }}
              placeholder="Search applications..."
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
            <Loader2 className="w-4 h-4 text-yellow-600" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold">{stats.pending}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-lg font-bold">{stats.approved}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
            <XCircle className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-lg font-bold">{stats.rejected}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <FilterSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}
            options={[
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
            ]}
            placeholder="All Statuses"
          />
          <FilterSelect
            value={positionFilter}
            onChange={(value) => {
              setPositionFilter(value)
              setCurrentPage(1)
            }}
            options={positions}
            placeholder="All Positions"
          />
        </div>
      </CardHeader>

      <CardContent>
        {paginatedApplications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || positionFilter !== 'all'
                ? 'No applications match your filters'
                : 'No applications yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>State Code</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApplications.map((app) => (
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
                      <TableCell className="text-sm">{app.position?.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            app.status === 'approved'
                              ? 'default'
                              : app.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="capitalize"
                        >
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
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
                                    <h3 className="font-semibold text-lg text-foreground">
                                      {selectedApp.full_name}
                                    </h3>
                                    <p className="text-muted-foreground font-mono">
                                      {selectedApp.state_code}
                                    </p>
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
                                    <p className="text-foreground">
                                      {selectedApp.attendance_rating}/10
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-muted-foreground text-sm mb-1">
                                    Campaign Mantra
                                  </p>
                                  <p className="text-foreground italic">"{selectedApp.mantra}"</p>
                                </div>

                                <div>
                                  <p className="text-muted-foreground text-sm mb-1">
                                    Why this position?
                                  </p>
                                  <p className="text-foreground text-sm">{selectedApp.reason}</p>
                                </div>

                                <DialogFooter className="gap-2 sm:gap-0">
                                  {selectedApp.status === 'pending' ? (
                                    <>
                                      <Button
                                        variant="destructive"
                                        onClick={() =>
                                          updateApplicationStatus(selectedApp.id, 'rejected')
                                        }
                                        disabled={updating}
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          updateApplicationStatus(selectedApp.id, 'approved')
                                        }
                                        disabled={updating}
                                      >
                                        {updating ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4 mr-2" />
                                        )}
                                        Approve
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge
                                      variant={
                                        selectedApp.status === 'approved'
                                          ? 'default'
                                          : 'destructive'
                                      }
                                      className="text-sm capitalize"
                                    >
                                      {selectedApp.status}
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

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value)
                setCurrentPage(1)
              }}
              totalItems={filteredApplications.length}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}