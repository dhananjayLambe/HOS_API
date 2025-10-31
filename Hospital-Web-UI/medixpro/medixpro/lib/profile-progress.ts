interface ProfileSection {
  key: string
  label: string
  weight: number
  fields: string[]
}

const PROFILE_SECTIONS: ProfileSection[] = [
  {
    key: "personal",
    label: "Personal Information",
    weight: 15,
    fields: ["firstName", "lastName", "gender", "dob", "about", "experience", "title"],
  },
  {
    key: "address",
    label: "Address Details",
    weight: 10,
    fields: ["address1", "city", "state", "pincode", "country"],
  },
  {
    key: "professional",
    label: "Professional Details",
    weight: 20,
    fields: ["primarySpecialization", "education", "certifications"],
  },
  {
    key: "kyc",
    label: "KYC & Verification",
    weight: 25,
    fields: ["pan", "aadhar", "registration", "digitalSignature"],
  },
  {
    key: "clinic",
    label: "Clinic Association",
    weight: 10,
    fields: ["clinics"],
  },
  {
    key: "fees",
    label: "Fee Structure",
    weight: 10,
    fields: ["feeStructure"],
  },
  {
    key: "services",
    label: "Services Offered",
    weight: 5,
    fields: ["services"],
  },
  {
    key: "bank",
    label: "Bank Details",
    weight: 5,
    fields: ["accountNumber", "ifsc", "bankName"],
  },
]

export function calculateProfileProgress(profileData: any): {
  totalProgress: number
  sectionProgress: Record<string, number>
  pendingSections: string[]
} {
  const sectionProgress: Record<string, number> = {}
  const pendingSections: string[] = []
  let totalProgress = 0

  PROFILE_SECTIONS.forEach((section) => {
    const completedFields = section.fields.filter((field) => {
      const value = profileData[field]
      return value !== null && value !== undefined && value !== "" && value !== []
    })

    const sectionCompletion = (completedFields.length / section.fields.length) * 100
    sectionProgress[section.key] = Math.round(sectionCompletion)

    if (sectionCompletion < 100) {
      pendingSections.push(section.label)
    }

    totalProgress += (sectionCompletion / 100) * section.weight
  })

  return {
    totalProgress: Math.round(totalProgress),
    sectionProgress,
    pendingSections,
  }
}

export function getBadges(profileData: any): string[] {
  const badges: string[] = []

  // KYC Verified Badge
  if (profileData.kycVerified) {
    badges.push("KYC Verified")
  }

  // Experience Badge
  if (profileData.experience >= 20) {
    badges.push("20+ Years Experience")
  } else if (profileData.experience >= 15) {
    badges.push("15+ Years Experience")
  } else if (profileData.experience >= 10) {
    badges.push("10+ Years Experience")
  }

  // Profile Completion Badge
  const progress = calculateProfileProgress(profileData)
  if (progress.totalProgress === 100) {
    badges.push("Complete Profile")
  } else if (progress.totalProgress >= 80) {
    badges.push("Pro Profile")
  }

  // Education Badge
  if (profileData.education?.length >= 3) {
    badges.push("Highly Qualified")
  }

  // Certification Badge
  if (profileData.certifications?.length >= 2) {
    badges.push("Certified Specialist")
  }

  // Membership Badge
  if (profileData.memberships?.length >= 2) {
    badges.push("Professional Member")
  }

  // Multi-clinic Badge
  if (profileData.clinics?.length >= 3) {
    badges.push("Multi-Clinic Practitioner")
  }

  return badges
}
