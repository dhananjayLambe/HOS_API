"use client"
import { cn } from "@/lib/utils"
import {
  User,
  MapPin,
  GraduationCap,
  ShieldCheck,
  Building2,
  DollarSign,
  Stethoscope,
  Award,
  CreditCard,
} from "lucide-react"

const sections = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "address", label: "Address Details", icon: MapPin },
  { id: "professional", label: "Professional Details", icon: GraduationCap },
  { id: "kyc", label: "KYC & Verification", icon: ShieldCheck },
  { id: "clinic", label: "Clinic Association", icon: Building2 },
  { id: "fees", label: "Fee Structure", icon: DollarSign },
  { id: "services", label: "Services Offered", icon: Stethoscope },
  { id: "memberships", label: "Memberships", icon: Award },
  { id: "bank", label: "Bank Details", icon: CreditCard },
]

interface ProfileNavigationProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function ProfileNavigation({ activeSection, onSectionChange }: ProfileNavigationProps) {
  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-6">
        <div className="flex gap-1 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
