'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github, Globe, Mail } from 'lucide-react'

export function Footer() {
  const pathname = usePathname()

  // Don't show footer on admin pages
  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">NYSC Editorial & Publicity CDS</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connecting the people through storytelling, media coverage, and content creation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
              <Link href="/apply" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Apply for Position
              </Link>
              <Link href="/vote" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cast Your Vote
              </Link>
            </div>
          </div>

          {/* Developer Credits */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Built By:</h3>
            <p className="text-sm font-medium text-foreground">Hassana Abdullahi</p>
            <p className="text-xs text-muted-foreground mb-3">Frontend Developer & Project Manager (Editorial and Publicity cds 2025/2026) Kano Chapter</p>
            <div className="flex items-center gap-3">
              <a
                href="mailto:hassanaabdll1@gmail.com"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/hassana123"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://portfolio-by-hassy.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Portfolio"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Editorial CDS 2025/2026 Batch - Kano State Chapter
          </p>
        </div>
      </div>
    </footer>
  )
}
