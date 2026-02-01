'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Vote, ChevronRight, Lock, User } from 'lucide-react'
import type { Position, ContestantApplication } from '@/lib/types'
import Image from 'next/image'

interface VotingInterfaceProps {
  positions: Position[]
  candidates: ContestantApplication[]
}

// Hash function for state code anonymization
async function hashStateCode(stateCode: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(stateCode.toUpperCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function VotingInterface({ positions, candidates }: VotingInterfaceProps) {
  const [step, setStep] = useState<'verify' | 'vote' | 'complete'>('verify')
  const [stateCode, setStateCode] = useState('')
  const [voterHash, setVoterHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [votedPositions, setVotedPositions] = useState<Set<string>>(new Set())
  const [voting, setVoting] = useState(false)

  const currentPosition = positions[currentPositionIndex]
  const positionCandidates = candidates.filter(c => c.position_id === currentPosition?.id)

  const verifyVoter = async () => {
    if (!stateCode || stateCode.length < 5) {
      setError('Please enter a valid state code')
      return
    }

    setVerifying(true)
    setError(null)

    const supabase = createClient()

    // Check if voter is a registered CDS member
    const { data: member, error: memberError } = await supabase
      .from('cds_members')
      .select('*')
      .eq('state_code', stateCode.toUpperCase())
      .single()

    if (memberError || !member) {
      setError('Your state code is not found in the CDS members list. Only registered members can vote.')
      setVerifying(false)
      return
    }

    if (!member.eligible) {
      setError('Your account is not eligible to vote. Please contact the electoral committee.')
      setVerifying(false)
      return
    }

    // Generate hash for anonymous voting
    const hash = await hashStateCode(stateCode)
    setVoterHash(hash)

    // Check which positions voter has already voted for
    const { data: existingVotes } = await supabase
      .from('votes')
      .select('position_id')
      .eq('voter_state_code_hash', hash)

    if (existingVotes && existingVotes.length > 0) {
      const votedPosIds = new Set(existingVotes.map(v => v.position_id))
      setVotedPositions(votedPosIds)
      
      // Find first position not yet voted for
      const firstUnvotedIndex = positions.findIndex(p => !votedPosIds.has(p.id))
      if (firstUnvotedIndex === -1) {
        setStep('complete')
        setVerifying(false)
        return
      }
      setCurrentPositionIndex(firstUnvotedIndex)
    }

    setVerified(true)
    setStep('vote')
    setVerifying(false)
  }

  const castVote = async () => {
    if (!selectedCandidate || !currentPosition) return

    setVoting(true)
    setError(null)

    const supabase = createClient()

    // Double-check hasn't already voted for this position
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_state_code_hash', voterHash)
      .eq('position_id', currentPosition.id)
      .single()

    if (existingVote) {
      setError('You have already voted for this position')
      setVoting(false)
      return
    }

    // Cast the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        voter_state_code_hash: voterHash,
        position_id: currentPosition.id,
        candidate_id: selectedCandidate
      })

    if (voteError) {
      setError('Failed to cast vote. Please try again.')
      setVoting(false)
      return
    }

    // Update voted positions
    setVotedPositions(prev => new Set([...prev, currentPosition.id]))
    setSelectedCandidate(null)

    // Move to next position or complete
    const nextUnvotedIndex = positions.findIndex((p, i) => 
      i > currentPositionIndex && !votedPositions.has(p.id)
    )

    if (nextUnvotedIndex === -1) {
      // Check if all positions voted
      const allVoted = positions.every(p => 
        votedPositions.has(p.id) || p.id === currentPosition.id
      )
      if (allVoted) {
        setStep('complete')
      } else {
        // Find any unvoted position
        const anyUnvoted = positions.findIndex(p => 
          !votedPositions.has(p.id) && p.id !== currentPosition.id
        )
        if (anyUnvoted !== -1) {
          setCurrentPositionIndex(anyUnvoted)
        } else {
          setStep('complete')
        }
      }
    } else {
      setCurrentPositionIndex(nextUnvotedIndex)
    }

    setVoting(false)
  }

  const skipPosition = () => {
    const nextIndex = positions.findIndex((p, i) => 
      i > currentPositionIndex && !votedPositions.has(p.id)
    )

    if (nextIndex === -1) {
      setStep('complete')
    } else {
      setCurrentPositionIndex(nextIndex)
      setSelectedCandidate(null)
    }
  }

  // Verification Step
  if (step === 'verify') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Voter Verification</CardTitle>
          <CardDescription>
            Enter your state code to verify your eligibility and proceed to vote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="state_code">State Code</Label>
            <Input
              id="state_code"
              placeholder="e.g., KN/24A/1234"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="uppercase text-center text-lg"
            />
          </div>

          <Button 
            onClick={verifyVoter} 
            className="w-full"
            disabled={verifying || !stateCode}
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify & Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your identity will be anonymized. Only your hashed state code is stored with your vote.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Completion Step
  if (step === 'complete') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-6">
            You have completed voting for all available positions. Your votes have been recorded securely and anonymously.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Return to Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Voting Step
  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Position {currentPositionIndex + 1} of {positions.length}
        </span>
        <Badge variant="outline" className="bg-transparent">
          {votedPositions.size} votes cast
        </Badge>
      </div>

      {/* Current Position */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{currentPosition?.name}</CardTitle>
              <CardDescription>Select one candidate to vote for</CardDescription>
            </div>
            <Vote className="w-8 h-8 text-primary/30" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {positionCandidates.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No approved candidates for this position</p>
              <Button variant="outline" onClick={skipPosition} className="mt-4 bg-transparent">
                Skip to Next Position
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {positionCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate.id)}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedCandidate === candidate.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                        <Image
                          src={candidate.image_url || '/placeholder.svg'}
                          alt={candidate.full_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{candidate.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.state_code}</p>
                        <p className="text-sm text-primary mt-1 italic">"{candidate.mantra}"</p>
                      </div>
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                        ${selectedCandidate === candidate.id 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground/30'
                        }
                      `}>
                        {selectedCandidate === candidate.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={skipPosition}
                  className="flex-1 bg-transparent"
                >
                  Skip Position
                </Button>
                <Button 
                  onClick={castVote}
                  disabled={!selectedCandidate || voting}
                  className="flex-1"
                >
                  {voting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Casting Vote...
                    </>
                  ) : (
                    <>
                      <Vote className="w-4 h-4 mr-2" />
                      Cast Vote
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Position Overview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">All Positions</CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            {positions.map((position, index) => (
              <Badge
                key={position.id}
                variant={
                  votedPositions.has(position.id) 
                    ? 'default' 
                    : index === currentPositionIndex 
                      ? 'secondary' 
                      : 'outline'
                }
                className={`text-xs ${votedPositions.has(position.id) ? '' : 'bg-transparent'}`}
              >
                {votedPositions.has(position.id) && (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                )}
                {position.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
