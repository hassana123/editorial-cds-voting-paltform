'use client'

import React from "react"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, CheckCircle2, XCircle } from 'lucide-react'
import type { Position } from '@/lib/types'
import Image from 'next/image'

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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [stateCodeVerified, setStateCodeVerified] = useState<boolean | null>(null)
  const [verifying, setVerifying] = useState(false)
  
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

  const verifyStateCode = async (stateCode: string) => {
    if (!stateCode || stateCode.length < 5) {
      setStateCodeVerified(null)
      return
    }
    
    setVerifying(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('cds_members')
      .select('*')
      .eq('state_code', stateCode.toUpperCase())
      .single()
    
    if (error || !data) {
      setStateCodeVerified(false)
      // Auto-fill if member found
    } else {
      setStateCodeVerified(true)
      setFormData(prev => ({
        ...prev,
        full_name: data.full_name || prev.full_name,
        batch: data.batch || prev.batch
      }))
    }
    setVerifying(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, image_url: data.secure_url }))
    } catch {
      setError('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!stateCodeVerified) {
      setError('Your state code must be verified as a registered CDS member')
      setLoading(false)
      return
    }

    if (!formData.image_url) {
      setError('Please upload your passport photograph')
      setLoading(false)
      return
    }

    const attendanceRating = parseInt(formData.attendance_rating)
    if (isNaN(attendanceRating) || attendanceRating < 1 || attendanceRating > 10) {
      setError('Attendance rating must be between 1 and 10')
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
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Application Submitted!</h3>
        <p className="text-muted-foreground">
          Your application has been submitted successfully. You will be notified once it has been reviewed.
        </p>
        <p className="text-muted-foreground text-sm mt-4">
          Redirecting to home page...
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* State Code with Verification */}
      <div className="space-y-2">
        <Label htmlFor="state_code">State Code *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="state_code"
              placeholder="e.g., KN/24A/1234"
              value={formData.state_code}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, state_code: e.target.value }))
                setStateCodeVerified(null)
              }}
              onBlur={(e) => verifyStateCode(e.target.value)}
              className="uppercase"
              required
            />
            {verifying && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {stateCodeVerified === true && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            )}
            {stateCodeVerified === false && (
              <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
        </div>
        {stateCodeVerified === false && (
          <p className="text-xs text-destructive">State code not found in CDS members list</p>
        )}
        {stateCodeVerified === true && (
          <p className="text-xs text-primary">State code verified</p>
        )}
      </div>

      {/* Full Name */}
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

      {/* Email */}
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

      {/* Phone */}
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

      {/* Batch */}
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

      {/* Position */}
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

      {/* Attendance Rating */}
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
        <p className="text-xs text-muted-foreground">Be honest - this will be verified</p>
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Why do you want this position? *</Label>
        <Textarea
          id="reason"
          placeholder="Explain your motivation and what you hope to achieve..."
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          rows={4}
          required
        />
      </div>

      {/* Mantra */}
      <div className="space-y-2">
        <Label htmlFor="mantra">Campaign Mantra/Slogan *</Label>
        <Input
          id="mantra"
          placeholder="Your campaign slogan"
          value={formData.mantra}
          onChange={(e) => setFormData(prev => ({ ...prev, mantra: e.target.value }))}
          required
        />
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Passport Photograph *</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          {formData.image_url ? (
            <div className="space-y-4">
              <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden">
                <Image
                  src={formData.image_url || "/placeholder.svg"}
                  alt="Uploaded photo"
                  fill
                  className="object-cover"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData(prev => ({ ...prev, image_url: '' }))
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="bg-transparent"
              >
                Remove & Upload New
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-transparent"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Select Photo'
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPEG, PNG or WebP. Max 5MB.
                </p>
              </div>
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
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={loading || !stateCodeVerified}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Application'
        )}
      </Button>
    </form>
  )
}
