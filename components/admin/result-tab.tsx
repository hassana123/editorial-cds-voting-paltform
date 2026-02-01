'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trophy, TrendingUp, Users, BarChart3 } from 'lucide-react'
import type { Position, ContestantApplication, Vote as VoteType } from '@/lib/types'

interface ResultsTabProps {
  positions: Position[]
  applications: ContestantApplication[]
  votes: VoteType[]
}

export function ResultsTab({ positions, applications, votes }: ResultsTabProps) {
  const [selectedPosition, setSelectedPosition] = useState<string>('all')

  // Calculate vote counts by position and candidate
  const voteCountsByPosition = useMemo(() => {
    return positions.map((position) => {
      const positionVotes = votes.filter((v) => v.position_id === position.id)
      const candidateCounts = applications
        .filter((a) => a.position_id === position.id && a.status === 'approved')
        .map((candidate) => ({
          candidate,
          votes: positionVotes.filter((v) => v.candidate_id === candidate.id).length,
        }))
        .sort((a, b) => b.votes - a.votes)

      return {
        position,
        totalVotes: positionVotes.length,
        candidates: candidateCounts,
      }
    })
  }, [positions, applications, votes])

  // Filter by selected position
  const filteredResults = useMemo(() => {
    if (selectedPosition === 'all') return voteCountsByPosition
    return voteCountsByPosition.filter((r) => r.position.id === selectedPosition)
  }, [voteCountsByPosition, selectedPosition])

  // Overall stats
  const totalVotes = votes.length
  const uniqueVoters = new Set(votes.map((v) => v.voter_state_code_hash)).size
  const totalCandidates = applications.filter((a) => a.status === 'approved').length

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Votes</p>
                <p className="text-2xl font-bold">{totalVotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Voters</p>
                <p className="text-2xl font-bold">{uniqueVoters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Candidates</p>
                <p className="text-2xl font-bold">{totalCandidates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter by position:</span>
        <Select value={selectedPosition} onValueChange={setSelectedPosition}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map((position) => (
              <SelectItem key={position.id} value={position.id}>
                {position.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results by Position */}
      <div className="space-y-4">
        {filteredResults.map(({ position, totalVotes, candidates }, positionIndex) => (
          <Card key={position.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{position.name}</CardTitle>
                <Badge variant="outline" className="bg-transparent">
                  {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No approved candidates for this position
                </p>
              ) : (
                <div className="space-y-3">
                  {candidates.map((item, index) => {
                    const percentage = totalVotes > 0 ? (item.votes / totalVotes) * 100 : 0
                    const isLeading = index === 0 && totalVotes > 0

                    return (
                      <div key={item.candidate.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isLeading && (
                              <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
                            )}
                            <span className="font-medium text-foreground truncate">
                              {item.candidate.full_name}
                            </span>
                            {isLeading && (
                              <Badge className="text-xs shrink-0">Leading</Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground ml-2 shrink-0">
                            {item.votes} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isLeading ? 'bg-primary' : 'bg-primary/60'
                            }`}
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

      {filteredResults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No results to display</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}