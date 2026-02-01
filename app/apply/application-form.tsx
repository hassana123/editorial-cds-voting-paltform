'use client'

import React from "react"
import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, Upload, CheckCircle2, XCircle, AlertCircle, Info, UserX } from 'lucide-react'
import type { Position } from '@/lib/types'
import Image from 'next/image'
import { toast } from 'sonner'

interface ApplicationFormProps {
  positions: Position[]
}

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

export function ApplicationForm({ positions }: ApplicationFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [stateCodeVerified, setStateCodeVerified] = useState<boolean | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [isCommitteeMember, setIsCommitteeMember] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  const [formData, setFormData] = useState({
    full_name: '',
    state_code: '',
    email: '',
    phone: '',
    batch: '',
    position_id: '',
    attendance_rating: '',
    reason: '',
    mantra: '',
    image_url: ''
  })

  // Calculate form completion percentage
  const formCompletion = useMemo(() => {
    const fields = [
      formData.state_code,
      formData.full_name,
      formData.email,
      formData.phone,
      formData.batch,
      formData.position_id,
      formData.attendance_rating,
      formData.reason,
      formData.mantra,
      formData.image_url
    ]
    const filledFields = fields.filter(field => field && field.length > 0).length
    return (filledFields / fields.length) * 100
  }, [formData])

  const verifyStateCode = async (stateCode: string) => {
    if (!stateCode || stateCode.length < 5) {
      setStateCodeVerified(null)
      setIsCommitteeMember(false)
      return
    }
    
    setVerifying(true)
    setError(null)
    const supabase = createClient()
    
    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('cds_members')
      .select('*')
      .eq('state_code', stateCode.toUpperCase())
      .single()
    
    if (memberError || !member) {
      setStateCodeVerified(false)
      setIsCommitteeMember(false)
      toast.error('State code not found in CDS members list')
    } else {
      setStateCodeVerified(true)
      
      // Check if they're a committee member
      const { data: committee } = await supabase
        .from('electoral_committee')
        .select('*')
        .eq('state_code', stateCode.toUpperCase())
        .single()
      
      if (committee) {
        setIsCommitteeMember(true)
        setError('Committee members are not eligible to apply for positions')
        toast.error('You are a committee member and cannot apply')
      } else {
        setIsCommitteeMember(false)
        // Auto-fill member data
        setFormData(prev => ({
          ...prev,
          full_name: member.full_name || prev.full_name,
          batch: member.batch || prev.batch
        }))
        toast.success('State code verified successfully')
      }
    }
    setVerifying(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setUploadProgress(100)
      setFormData(prev => ({ ...prev, image_url: data.secure_url }))
      toast.success('Photo uploaded successfully')
    } catch {
      toast.error('Failed to upload image. Please try again.')
      setError('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!stateCodeVerified) {
      setError('Your state code must be verified as a registered CDS member')
      toast.error('Please verify your state code first')
      setLoading(false)
      return
    }

    if (isCommitteeMember) {
      setError('Committee members are not eligible to apply for positions')
      toast.error('Committee members cannot apply')
      setLoading(false)
      return
    }

    if (!formData.image_url) {
      setError('Please upload your passport photograph')
      toast.error('Passport photograph is required')
      setLoading(false)
      return
    }

    const attendanceRating = parseInt(formData.attendance_rating)
    if (isNaN(attendanceRating) || attendanceRating < 1 || attendanceRating > 10) {
      setError('Attendance rating must be between 1 and 10')
      toast.error('Invalid attendance rating')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Check if already applied for this position
    const { data: existingApp } = await supabase
      .from('contestant_applications')
      .select('id')
      .eq('state_code', formData.state_code.toUpperCase())
      .eq('position_id', formData.position_id)
      .single()

    if (existingApp) {
      setError('You have already applied for this position')
      toast.error('You have already applied for this position')
      setLoading(false)
      return
    }

    // Submit application
    const { error: submitError } = await supabase
      .from('contestant_applications')
      .insert({
        full_name: formData.full_name,
        state_code: formData.state_code.toUpperCase(),
        email: formData.email,
        phone: formData.phone,
        batch: formData.batch,
        position_id: formData.position_id,
        attendance_rating: attendanceRating,
        reason: formData.reason,
        mantra: formData.mantra,
        image_url: formData.image_url,
        status: 'pending'
      })

    if (submitError) {
      setError(submitError.message)
      toast.error('Failed to submit application')
      setLoading(false)
      return
    }

    setSuccess(true)
    toast.success('Application submitted successfully!')
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }

  if (success) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground">Application Submitted!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your application has been submitted successfully. The electoral committee will review it shortly.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting to home page...</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Indicator */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Form Completion</span>
            <span className="text-muted-foreground">{Math.round(formCompletion)}%</span>
          </div>
          <Progress value={formCompletion} className="h-2" />
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* State Code Verification - Step 1 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            1
          </div>
          <h3 className="font-semibold text-foreground">Verify Your Identity</h3>
        </div>

        <div className="space-y-2 pl-10">
          <Label htmlFor="state_code">State Code *</Label>
          <div className="relative">
            <Input
              id="state_code"
              placeholder="e.g., KN/24A/1234"
              value={formData.state_code}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, state_code: e.target.value }))
                setStateCodeVerified(null)
                setIsCommitteeMember(false)
              }}
              onBlur={(e) => verifyStateCode(e.target.value)}
              className="uppercase pr-10"
              required
            />
            {verifying && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {stateCodeVerified === true && !isCommitteeMember && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            )}
            {(stateCodeVerified === false || isCommitteeMember) && (
              <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
          
          {stateCodeVerified === false && (
            <Alert variant="destructive" className="mt-2">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                State code not found in CDS members list. Please check and try again.
              </AlertDescription>
            </Alert>
          )}
          
          {isCommitteeMember && (
            <Alert variant="destructive" className="mt-2">
              <UserX className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Committee members are not eligible to apply for positions. You cannot submit this application.
              </AlertDescription>
            </Alert>
          )}
          
          {stateCodeVerified === true && !isCommitteeMember && (
            <Alert className="mt-2 border-primary/20 bg-primary/5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-foreground">
                State code verified successfully. You are eligible to apply.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Personal Information - Step 2 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            2
          </div>
          <h3 className="font-semibold text-foreground">Personal Information</h3>
        </div>

        <div className="space-y-4 pl-10">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch *</Label>
              <Input
                id="batch"
                placeholder="e.g., 2024 Batch A"
                value={formData.batch}
                onChange={(e) => setFormData(prev => ({ ...prev, batch: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08012345678"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Position & Campaign - Step 3 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            3
          </div>
          <h3 className="font-semibold text-foreground">Position & Campaign Details</h3>
        </div>

        <div className="space-y-4 pl-10">
          <div className="space-y-2">
            <Label htmlFor="position">Position Contesting For *</Label>
            <Select
              value={formData.position_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, position_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendance_rating">Attendance Rating (1-10) *</Label>
            <Input
              id="attendance_rating"
              type="number"
              min="1"
              max="10"
              placeholder="Rate your CDS attendance from 1 to 10"
              value={formData.attendance_rating}
              onChange={(e) => setFormData(prev => ({ ...prev, attendance_rating: e.target.value }))}
              required
            />
            <Alert className="border-blue-500/20 bg-blue-500/5">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-foreground">
                Be honest - this will be verified with attendance records
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mantra">Campaign Mantra/Slogan *</Label>
            <Input
              id="mantra"
              placeholder="Your campaign slogan (e.g., 'Leadership for Progress')"
              value={formData.mantra}
              onChange={(e) => setFormData(prev => ({ ...prev, mantra: e.target.value }))}
              required
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.mantra.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want this position? *</Label>
            <Textarea
              id="reason"
              placeholder="Explain your motivation, vision, and what you hope to achieve in this role..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={5}
              required
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.reason.length}/500 characters
            </p>
          </div>
        </div>
      </div>

      {/* Photo Upload - Step 4 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            4
          </div>
          <h3 className="font-semibold text-foreground">Passport Photograph</h3>
        </div>

        <div className="pl-10">
          <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
            <div className="p-6">
              {formData.image_url ? (
                <div className="space-y-4">
                  <div className="relative w-40 h-40 mx-auto rounded-lg overflow-hidden ring-4 ring-primary/20">
                    <Image
                      src={formData.image_url}
                      alt="Uploaded photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Photo uploaded successfully</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, image_url: '' }))
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      Remove & Upload New
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Upload your passport photograph</p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG or WebP. Max 5MB. Clear photo with plain background preferred.
                    </p>
                  </div>
                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Select Photo
                      </>
                    )}
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6 border-t">
        <Button 
          type="submit" 
          className="w-full h-12 text-base" 
          disabled={loading || !stateCodeVerified || isCommitteeMember || formCompletion < 100}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Submitting Application...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Submit Application
            </>
          )}
        </Button>
        
        {formCompletion < 100 && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Complete all fields to submit your application
          </p>
        )}
      </div>
    </form>
  )
}