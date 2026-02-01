'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useState } from 'react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/apply', label: 'Apply' },
  { href: '/vote', label: 'Vote' },
]

export function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Don't show header on admin pages
  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-full overflow-hidden">
              <Image
                src="/images/logo.jpeg"
                alt="NYSC Editorial CDS Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">Editorial CDS</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Kano State Chapter</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm ${
                    pathname === link.href
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            <Link href="/admin/login">
              <Button size="sm" variant="outline" className="ml-2 bg-transparent">
                Admin
              </Button>
            </Link>
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`text-lg font-medium transition-colors ${
                      pathname === link.href
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/admin/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    Admin Login
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
