import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, Mic, FileText, Users, Award, Heart, 
  ArrowRight, Mail, Github, Globe, Megaphone
} from 'lucide-react'

const galleryImages = [
  { src: '/images/group-1.jpeg', alt: 'CDS Group Photo' },
  { src: '/images/group-2.jpeg', alt: 'CDS Selfie' },
  { src: '/images/meeting.jpeg', alt: 'CDS Meeting' },
  { src: '/images/certificates.jpeg', alt: 'Certificate Ceremony' },
  { src: '/images/group-3.jpeg', alt: 'CDS Members' },
  { src: '/images/group-4.jpeg', alt: 'CDS Group' },
]

const focusAreas = [
  {
    icon: FileText,
    title: 'Documentation',
    description: 'Recording and preserving the activities and achievements of corps members'
  },
  {
    icon: Mic,
    title: 'Reporting',
    description: 'Accurate and timely coverage of NYSC events and community projects'
  },
  {
    icon: Camera,
    title: 'Content Creation',
    description: 'Creating engaging visual and written content for public awareness'
  },
  {
    icon: Megaphone,
    title: 'Public Awareness',
    description: 'Promoting impactful initiatives and celebrating achievements'
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-5 md:py-10">
        <div className="absolute inset-0 bg-[url('/images/group-5.jpeg')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            Kano State Chapter
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 text-balance">
            NYSC Editorial & Publicity CDS
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-6 text-pretty">
            Connecting the People through storytelling, media coverage, and content creation
          </p>
          <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden ring-4 ring-primary-foreground/20">
            <Image
              src="/images/logo.jpeg"
              alt="NYSC Editorial CDS Logo"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">About Us</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              The NYSC Editorial and Publicity Community Development Service (CDS) is responsible 
              for documenting, reporting, and promoting the activities of corps members within the 
              community. Our CDS focuses on storytelling, media coverage, content creation, and 
              public awareness—highlighting impactful initiatives, celebrating achievements, and 
              ensuring accurate communication between the CDS, the NYSC body, and the general public.
            </p>
          </div>

          {/* Focus Areas */}
          <div className="grid sm:grid-cols-2 gap-4">
            {focusAreas.map((area) => (
              <Card key={area.title} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                      <area.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{area.title}</h3>
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-10  bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Our Moments</h2>
            <p className="text-muted-foreground">Capturing memories from our CDS activities</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((image, index) => (
              <div 
                key={image.src} 
                className={`relative overflow-hidden rounded-xl ${
                  index === 0 ? 'col-span-2 md:col-span-1 md:row-span-2 aspect-square md:aspect-auto' : 'aspect-video'
                }`}
              >
                <Image
                  src={image.src || "/placeholder.svg"}
                  alt={image.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Our Values</h2>
            <p className="text-muted-foreground">What drives us forward</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Unity</h3>
              <p className="text-sm text-muted-foreground">
                Working together as one team to achieve our common goals
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Excellence</h3>
              <p className="text-sm text-muted-foreground">
                Striving for the highest quality in everything we do
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Service</h3>
              <p className="text-sm text-muted-foreground">
                Dedicated to serving our community with passion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-primary/5 p-6 border-b border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Platform Developer</p>
                <h3 className="text-xl font-bold text-foreground">Hassana Abdullahi</h3>
                <p className="text-sm text-muted-foreground">Frontend Developer & Project Manager</p>
                <p className="text-xs text-primary mt-1">Editorial CDS 2025/2026</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  This electronic election platform was built to ensure transparent, fair, and 
                  efficient elections for the Editorial & Publicity CDS leadership positions.
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="mailto:hassanaabdll1@gmail.com"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                  <a
                    href="https://github.com/hassana123"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                  <a
                    href="https://portfolio-by-hassy.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Portfolio
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Participate?</h2>
          <p className="text-muted-foreground mb-6">
            Join us in electing competent leaders who will drive the vision of our CDS forward.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/apply">
              <Button size="lg" className="gap-2">
                Apply for Position
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/vote">
              <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                Cast Your Vote
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
