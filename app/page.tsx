//'use cache'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Vote, UserPlus, Shield, CheckCircle2, Users, ArrowRight, Sparkles, TrendingUp } from 'lucide-react'
import type { SystemSettings } from '@/lib/types'
import { LiveVoteCounter } from '@/components/live-vote-counter'

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .single()
  
  const systemSettings = settings as SystemSettings | null

  // Get live vote stats if voting is open
  let voteStats = []
  let totalEligibleVoters = 0
  
  if (systemSettings?.voting_open) {
    const { data: stats } = await supabase.rpc('get_live_vote_stats')
    voteStats = stats || []
    
    // Get total eligible voters (CDS members who are not committee members)
    const { count } = await supabase
      .from('cds_members')
      .select('*', { count: 'exact', head: true })
      .eq('is_eligible', true)
    
    totalEligibleVoters = count || 0
  }

  return (
    <div className="min-h-screen md:px-0 px-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-6xl mx-auto py-5 md:py-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="order-2 md:order-1">
              <Badge variant="outline" className="mb-4 bg-primary/5 border-primary/20 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                2025/2026 Elections
              </Badge>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance leading-tight">
                Shape the Future of{' '}
                <span className="text-primary">Editorial CDS</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-6 text-pretty leading-relaxed">
                Join us in electing competent leaders who will drive the vision of our 
                Community Development Service group forward. Your voice matters.
              </p>
              
              {/* Status Pills */}
              <div className="flex flex-wrap gap-3 mb-8">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  systemSettings?.applications_open 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <UserPlus className="w-4 h-4" />
                  Applications {systemSettings?.applications_open ? 'Open' : 'Closed'}
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  systemSettings?.voting_open 
                    ? 'bg-primary text-primary-foreground animate-pulse' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Vote className="w-4 h-4" />
                  Voting {systemSettings?.voting_open ? 'Live Now' : 'Closed'}
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link href="/apply">
                  <Button size="lg" disabled={!systemSettings?.applications_open} className="gap-2">
                    Run for Office
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/vote">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    disabled={!systemSettings?.voting_open} 
                    className="gap-2 bg-transparent"
                  >
                    {systemSettings?.voting_open && (
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}
                    Cast Your Vote
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right Content - Logo/Image */}
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-110" />
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden ring-4 ring-background shadow-2xl">
                  <Image
                    src="/images/logo.jpeg"
                    alt="NYSC Editorial CDS Logo"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Vote Counter Section - Only show when voting is open */}
      {systemSettings?.voting_open && voteStats.length > 0 && (
        <section className="py-10 bg-gradient-to-b from-muted/50 to-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Live Election Results
                </h2>
              </div>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Watch the votes come in real-time as your fellow corps members make their choices
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <LiveVoteCounter 
                initialStats={voteStats} 
                totalEligibleVoters={totalEligibleVoters}
              />
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Election Integrity Guaranteed
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our electronic election system ensures transparency, security, and fairness at every step.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                icon: CheckCircle2, 
                title: 'Verified Members', 
                desc: 'Only registered CDS members can participate in elections' 
              },
              { 
                icon: Shield, 
                title: 'Secure Voting', 
                desc: 'Anonymous votes with cryptographic hashing protection' 
              },
              { 
                icon: Vote, 
                title: 'One Vote Policy', 
                desc: 'Each member can only vote once per position' 
              },
              { 
                icon: Users, 
                title: 'Live Results', 
                desc: 'Real-time vote counting and transparent results' 
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Actions Section */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Get Involved
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you want to lead or choose your leaders, there is a role for you.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Apply Card */}
            <Card className="relative overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Run for Office</CardTitle>
                <CardDescription>
                  Submit your application to contest for any executive position in the CDS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/apply">
                  <Button className="w-full" disabled={!systemSettings?.applications_open}>
                    {systemSettings?.applications_open ? 'Apply Now' : 'Applications Closed'}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Vote Card */}
            <Card className="relative overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-2">
                  <Vote className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Cast Your Vote</CardTitle>
                <CardDescription>
                  Exercise your right to vote and choose your preferred candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/vote">
                  <Button 
                    className="w-full" 
                    disabled={!systemSettings?.voting_open}
                  >
                    {systemSettings?.voting_open ? (
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Vote Now
                      </span>
                    ) : 'Voting Closed'}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* About Card */}
            <Card className="relative overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-muted rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader>
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-foreground" />
                </div>
                <CardTitle>About Us</CardTitle>
                <CardDescription>
                  Learn more about the Editorial & Publicity CDS and our mission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/about">
                  <Button variant="outline" className="w-full bg-transparent">
                    Learn More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Image Banner */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <Image
          src="/images/group-1.jpeg"
          alt="NYSC Editorial CDS Members"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/60" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
              Connecting the People
            </h3>
            <p className="text-primary-foreground/80 max-w-lg mx-auto">
              Through storytelling, media coverage, and content creation
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}