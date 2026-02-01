'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, FileSpreadsheet, Info } from 'lucide-react'

interface BulkUploadFormProps {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

interface ParsedMember {
  state_code: string
  full_name: string
  batch: string
}

export function BulkUploadForm({ onSuccess, onError }: BulkUploadFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const parseCSV = (text: string): ParsedMember[] => {
    const lines = text.trim().split('\n')
    const members: ParsedMember[] = []

    // Skip header row if it exists
    const startIndex = lines[0].toLowerCase().includes('state') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(',').map(p => p.trim())
      
      if (parts.length >= 3) {
        members.push({
          state_code: parts[0].toUpperCase(),
          full_name: parts[1],
          batch: parts[2]
        })
      }
    }

    return members
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        onError('Please select a valid CSV file')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      onError('Please select a CSV file first')
      return
    }

    setIsLoading(true)

    try {
      const text = await selectedFile.text()
      const parsedMembers = parseCSV(text)

      if (parsedMembers.length === 0) {
        onError('No valid entries found in CSV file')
        setIsLoading(false)
        return
      }

      const supabase = createClient()

      // Get all electoral committee members
      const { data: committeeMembers } = await supabase
        .from('electoral_committee')
        .select('state_code')

      const committeeStateCodes = new Set(
        committeeMembers?.map(m => m.state_code) || []
      )

      // Prepare members with electoral committee status
      const membersToInsert = parsedMembers.map(member => ({
        state_code: member.state_code,
        full_name: member.full_name,
        batch: member.batch,
        is_electoral_committee: committeeStateCodes.has(member.state_code),
        eligible: !committeeStateCodes.has(member.state_code),
        ineligible_reason: committeeStateCodes.has(member.state_code) 
          ? 'Electoral committee member' 
          : null
      }))

      const { error } = await supabase
        .from('cds_members')
        .upsert(membersToInsert, { onConflict: 'state_code' })

      if (error) {
        onError('Failed to upload members')
      } else {
        onSuccess(`Successfully uploaded ${parsedMembers.length} members!`)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        router.refresh()
      }
    } catch (err) {
      onError('Failed to parse CSV file')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bulk Upload Members</CardTitle>
        <CardDescription>Upload a CSV file to add multiple members at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>CSV Format:</strong> state_code, full_name, batch
            <br />
            <strong>Example:</strong> KN/24A/1234, John Doe, Batch A
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
              className="cursor-pointer"
            />
          </div>
          {selectedFile && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {selectedFile.name}
            </p>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={isLoading || !selectedFile}
          className="w-full"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />Upload CSV</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}