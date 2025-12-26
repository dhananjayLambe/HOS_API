"use client"

import { X, MapPin, Phone, Mail, Award, GraduationCap, Briefcase, Clock, Star, Calendar } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ProfilePreviewProps {
  open: boolean
  onClose: () => void
  doctorData: {
    name: string
    role: string
    email: string
    phone: string
    registrationNumber: string
    experience: string
    profilePhoto: string
    isVerified: boolean
  }
}

export function ProfilePreview({ open, onClose, doctorData }: ProfilePreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] max-w-5xl overflow-hidden p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Public Profile Preview</h2>
            <p className="text-sm text-muted-foreground">This is how patients will see your profile</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto">
          <div className="space-y-8 p-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8">
              <div className="flex flex-col items-start gap-6 md:flex-row">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                  <AvatarImage src={doctorData.profilePhoto || "/placeholder.svg"} alt={doctorData.name} />
                  <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">
                    {doctorData.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold">{doctorData.name}</h1>
                      {doctorData.isVerified && (
                        <Badge className="bg-success text-success-foreground">
                          <Award className="mr-1 h-4 w-4" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xl text-muted-foreground">{doctorData.role}</p>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Experience</p>
                        <p className="font-medium">{doctorData.experience}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Registration</p>
                        <p className="font-medium">{doctorData.registrationNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-yellow-500/10 p-2">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rating</p>
                        <p className="font-medium">4.8 (124 reviews)</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button size="lg" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Book Appointment
                    </Button>
                    <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                      <Phone className="h-4 w-4" />
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-l-4 border-l-primary p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Phone Number</p>
                    <p className="mt-0.5 truncate font-semibold">{doctorData.phone}</p>
                  </div>
                </div>
              </Card>
              <Card className="border-l-4 border-l-primary p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Email Address</p>
                    <p className="mt-0.5 truncate font-semibold">{doctorData.email}</p>
                  </div>
                </div>
              </Card>
              <Card className="border-l-4 border-l-primary p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Location</p>
                    <p className="mt-0.5 truncate font-semibold">New York, USA</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* About Section */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <div className="h-1 w-8 rounded-full bg-primary" />
                About Dr. {doctorData.name.split(" ").pop()}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                Dr. Sarah Johnson is a highly experienced Consultant Cardiologist with over 15 years of expertise in
                cardiovascular medicine. She specializes in preventive cardiology, heart failure management, and
                advanced cardiac imaging. Dr. Johnson is committed to providing personalized, evidence-based care to her
                patients and has been recognized for her contributions to cardiac research and patient care excellence.
              </p>
            </Card>

            {/* Education & Certifications */}
            <Card className="p-6">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                <div className="h-1 w-8 rounded-full bg-primary" />
                Education & Certifications
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Doctor of Medicine (MD) in Cardiology</p>
                    <p className="mt-1 text-sm text-muted-foreground">Harvard Medical School</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">2005 - 2009</p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Board Certified in Cardiovascular Disease</p>
                    <p className="mt-1 text-sm text-muted-foreground">American Board of Internal Medicine</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Certified 2010</p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Fellowship in Interventional Cardiology</p>
                    <p className="mt-1 text-sm text-muted-foreground">Mayo Clinic</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">2010 - 2012</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Services & Fees */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <div className="h-1 w-8 rounded-full bg-primary" />
                  Services Offered
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="px-3 py-1.5">
                    Cardiac Consultation
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    ECG & Echocardiography
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    Stress Testing
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    Heart Disease Management
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    Preventive Cardiology
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    Cardiac Rehabilitation
                  </Badge>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <div className="h-1 w-8 rounded-full bg-primary" />
                  Consultation Fees
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="font-medium">In-Person Consultation</span>
                    <span className="text-lg font-bold text-primary">$150</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="font-medium">Video Consultation</span>
                    <span className="text-lg font-bold text-primary">$100</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="font-medium">Follow-up Visit</span>
                    <span className="text-lg font-bold text-primary">$75</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Availability */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <div className="h-1 w-8 rounded-full bg-primary" />
                Availability Schedule
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Monday - Friday</p>
                    <p className="text-sm text-muted-foreground">9:00 AM - 5:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Saturday</p>
                    <p className="text-sm text-muted-foreground">10:00 AM - 2:00 PM</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
