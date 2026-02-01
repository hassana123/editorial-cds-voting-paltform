import React from "react"
import Image from 'next/image'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      {/* Minimal Top Bar */}
      <div className="bg-sidebar p-2 border-b border-sidebar-border">
        <div className="max-w-6xl mx-auto   flex items-center gap-1">
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-sidebar-border">
            <Image
              src="/images/logo.jpeg"
              alt="Editorial CDS Logo"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">Editorial CDS Admin</p>
            <p className="text-xs text-sidebar-foreground/60">Electoral Committee Portal</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
