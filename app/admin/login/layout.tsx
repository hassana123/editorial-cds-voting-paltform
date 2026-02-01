import React from "react"

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Override the admin layout to have no header for login page
  return <>{children}</>
}
