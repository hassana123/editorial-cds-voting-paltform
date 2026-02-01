'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Shield, CheckCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Show success overlay
      setIsSuccess(true)

      // Delay redirect so user sees success state
      setTimeout(() => {
        router.push('/admin')
        router.refresh()
      }, 1800)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 relative">

      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Authenticating...</p>
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY */}
      {isSuccess && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="text-center flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <h3 className="text-lg font-semibold">Login Successful</h3>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>

          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Electoral Committee Access Only
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Sign In</CardTitle>
                <CardDescription className="text-xs">
                  Enter your admin credentials
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                Only authorized electoral committee members can access this portal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
