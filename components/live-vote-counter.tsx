'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Vote, TrendingUp, Users, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VoteStats {
  position_name: string
  total_votes: number
  leading_candidate: string | null
  leading_votes: number
}

interface LiveVoteCounterProps {
  initialStats: VoteStats[]
  totalEligibleVoters: number
}

export function LiveVoteCounter({ initialStats, totalEligibleVoters }: LiveVoteCounterProps) {
  const [stats, setStats] = useState(initialStats)
  const [totalVotes, setTotalVotes] = useState(0)
  const [recentVote, setRecentVote] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Calculate initial total
    const initial = initialStats.reduce((sum, stat) => sum + stat.total_votes, 0)
    setTotalVotes(initial)

    // Subscribe to vote changes
    const channel = supabase
      .channel('vote-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes'
        },
        (payload) => {
          // Show recent vote animation
          setRecentVote('New vote cast!')
          setTimeout(() => setRecentVote(null), 3000)
          
          // Refresh stats
          refreshStats()
        }
      )
      .subscribe()

    // Refresh stats every 10 seconds
    const interval = setInterval(() => {
      refreshStats()
    }, 10000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const refreshStats = async () => {
    const supabase = createClient()
    
    const { data } = await supabase.rpc('get_live_vote_stats')
    
    if (data) {
      setStats(data)
      const total = data.reduce((sum: number, stat: VoteStats) => sum + stat.total_votes, 0)
      setTotalVotes(total)
    }
  }

  const turnoutPercentage = totalEligibleVoters > 0 
    ? (totalVotes / totalEligibleVoters) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-medium text-foreground">Live Vote Count</span>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="w-3 h-3" />
          Real-time Updates
        </Badge>
      </div>

      {/* Recent Vote Animation */}
      <AnimatePresence>
        {recentVote && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-primary">
              <Vote className="w-4 h-4 animate-bounce" />
              <span className="text-sm font-medium">{recentVote}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall Stats */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Votes Cast</p>
                <motion.p 
                  className="text-3xl font-bold text-primary"
                  key={totalVotes}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {totalVotes.toLocaleString()}
                </motion.p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Vote className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Voter Turnout</p>
                <p className="text-3xl font-bold text-accent">
                  {turnoutPercentage.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnout Progress */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Participation Progress</span>
            <span className="font-medium text-foreground">
              {totalVotes} / {totalEligibleVoters} voters
            </span>
          </div>
          <Progress value={turnoutPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Position-wise Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Votes by Position
          </CardTitle>
          <CardDescription>Live vote count for each position</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.position_name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{stat.position_name}</p>
                  {stat.leading_candidate && (
                    <p className="text-xs text-muted-foreground">
                      Leading: {stat.leading_candidate} ({stat.leading_votes} votes)
                    </p>
                  )}
                </div>
                <motion.div
                  key={stat.total_votes}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Badge variant="secondary" className="font-mono">
                    {stat.total_votes}
                  </Badge>
                  <Vote className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={totalEligibleVoters > 0 ? (stat.total_votes / totalEligibleVoters) * 100 : 0} 
                  className="h-2"
                />
              </div>
            </motion.div>
          ))}

          {stats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Vote className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No votes cast yet. Be the first to vote!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <p className="text-xs text-center text-muted-foreground">
        Updates automatically every 10 seconds
      </p>
    </div>
  )
}