"use client"

import type React from "react"
import { useState } from "react"
import { Stethoscope, Users, FlaskConical, Shield, Check } from "lucide-react"

const Card = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className}`} {...props} />
)

const CardHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
)

const CardTitle = ({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props} />
)

const CardDescription = ({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
)

const CardContent = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
)

const Badge = ({
  className = "",
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }) => {
  const variantClasses =
    {
      default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
      secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      outline: "text-foreground",
    }[variant] || ""

  const combinedClasses = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${className}`

  return <div className={combinedClasses} {...props} />
}

const Button = ({
  className = "",
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}) => {
  const baseClasses =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

  const variantClasses =
    {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    }[variant] || ""

  const combinedClasses = `${baseClasses} h-10 px-4 py-2 ${variantClasses} ${className}`

  return <button className={combinedClasses} {...props} />
}

// Inline SVG icon
const HeartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.87 0-3.69.83-5.12 2.72L12 7.5l-1.38-1.78C9.19 3.83 7.37 3 5.5 3A5.5 5.5 0 0 0 0 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

type Role = { name: string; icon: React.ComponentType<any>; path: string }

export default function RegistrationPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const [mobile, setMobile] = useState("")
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusResult, setStatusResult] = useState<null | { status: string; message: string }>(null)

  const roles: Role[] = [
    { name: "Clinic", icon: Users, path: "register/clinic-registration" },
    { name: "Doctor", icon: Stethoscope, path: "register/doctor-registration" },
    //{ name: "HelpDesk", icon: Users, path: "/helpdesk-registration" },
    { name: "LabAdmin", icon: FlaskConical, path: "register/lab-registration" },
    { name: "SuperUser", icon: Shield, path: "register/superuser-registration" },
  ]

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setIsRedirecting(true)
    // Keep existing navigation behavior
    window.location.href = role.path
  }

  const handleStatusCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusResult(null)
    const trimmed = mobile.trim()
    if (!trimmed) {
      setStatusResult({ status: "error", message: "Please enter your mobile number." })
      return
    }
    try {
      setStatusLoading(true)
      const res = await fetch(`/api/registration-status?username=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) {
        setStatusResult({ status: "error", message: data?.message || "Unable to check status. Please try again." })
      } else {
        setStatusResult({ status: data.status, message: data.message })
      }
    } catch {
      setStatusResult({ status: "error", message: "Network error. Please try again." })
    } finally {
      setStatusLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950 p-4 md:p-8">
      {/* Back to Home Link */}
      <a
        href="/"
        className="absolute top-4 left-4 md:top-8 md:left-8 z-10 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
      >
        &larr; Back to Home
      </a>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        {/* Left Panel - Getting Started */}
        <div className="hidden lg:flex lg:flex-col">
          <Card className="flex-1 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20 border-purple-200/50 dark:border-purple-800/30">
            <CardContent className="p-10 flex flex-col h-full">
              {/* Getting Started Title with modern styling */}
              <div className="mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent mb-4 text-balance leading-tight">
                  Getting Started
                </h2>
                <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed text-pretty">
                  Follow these steps to get your clinic up and running. We'll guide you through each stage from
                  registering your clinic to getting admin approval.
                </p>
              </div>

              {/* Steps List with modern card design */}
              <div className="space-y-4 flex-1">
                {/* Step 1 - Clinic Registration */}
                <div 
                  onClick={() =>
                        handleRoleSelect({ name: "Clinic", icon: Users, path: "register/clinic-registration" })
                }
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 p-[2px] shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-md">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Clinic Registration</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Register your clinic details</p>
                    </div>
                  </div>
                </div>

                {/* Step 2 - Doctor Registration */}
                <div
                  onClick={() =>
                    handleRoleSelect({ name: "Doctor", icon: Stethoscope, path: "register/doctor-registration" })
                } 
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 p-[2px] hover:from-purple-400 hover:to-violet-400 dark:hover:from-purple-600 dark:hover:to-violet-600 transition-all duration-300">
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 flex items-center justify-center transition-colors duration-300">
                      <Check className="h-6 w-6 text-slate-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Doctor Registration</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Add doctor information</p>
                    </div>
                  </div>
                </div>

                {/* Step 3 - Admin Approval */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 p-[2px] hover:from-purple-400 hover:to-violet-400 dark:hover:from-purple-600 dark:hover:to-violet-600 transition-all duration-300">
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 flex items-center justify-center transition-colors duration-300">
                      <Check className="h-6 w-6 text-slate-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Admin Approval</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Wait for admin verification</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern decorative element */}
              <div className="mt-8 pt-6 border-t border-purple-200/50 dark:border-purple-800/30">
                <p className="text-sm text-slate-500 dark:text-slate-500 text-center italic">
                  Complete all steps to activate your account
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Registration Form */}
        <div className="flex flex-col">
          <Card className="flex-1 rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50">
            <CardHeader className="p-8 md:p-10">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg">
                  <HeartIcon className="h-7 w-7 text-white" />
                </div>
                <span className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  MedixPro
                </span>
              </div>
              <CardTitle className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-white text-balance">
                Secure Registration
              </CardTitle>
              <CardDescription className="text-center text-base text-slate-600 dark:text-slate-400 mt-3">
                Select your role to register
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 md:p-10 pt-0">
              {!isRedirecting ? (
                <>
                  {/* Step 1 label for user understanding */}
                  <div className="mb-6 text-center">
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      Step 1
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                    {roles.map((role) => {
                      const Icon = role.icon
                      return (
                        <Card
                          key={role.name}
                          className={`relative cursor-pointer transition-all duration-300 rounded-2xl
                        hover:shadow-xl hover:scale-105 group
                        ${
                          selectedRole && selectedRole.name === role.name
                            ? "border-purple-500 ring-2 ring-purple-500 shadow-xl scale-105 bg-purple-50 dark:bg-purple-950/30"
                            : "border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700"
                        }`}
                          onClick={() => handleRoleSelect(role)}
                        >
                          <CardContent className="flex flex-col items-center justify-center p-5 md:p-6">
                            <div className="p-3 md:p-4 rounded-xl bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors duration-300">
                              <Icon className="h-7 w-7 md:h-8 md:w-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="mt-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {role.name}
                            </span>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    You have selected {selectedRole ? selectedRole.name : ""}.
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Redirecting to {selectedRole?.path}...
                  </p>
                  <Button
                    variant="link"
                    className="mt-4 p-0 text-purple-600 hover:text-purple-700"
                    onClick={() => setIsRedirecting(false)}
                  >
                    &larr; Go Back to Role Selection
                  </Button>
                </div>
              )}

              <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
                {/* Step 2 label for user understanding */}
                <div className="text-center mb-6">
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4">
                    Step 2
                  </p>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-balance">
                    Check Registration Request Status
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-pretty">
                    Enter your username (mobile number) to see if your account was approved.
                  </p>
                </div>

                <form
                  onSubmit={handleStatusCheck}
                  className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-3"
                >
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    aria-label="Mobile number"
                    autoComplete="tel"
                  />
                  <Button
                    type="submit"
                    className="md:w-auto w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {statusLoading ? "Checking..." : "Check Status"}
                  </Button>
                </form>

                {statusResult && (
                  <div className="mt-6 rounded-xl border-2 border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-950">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{statusResult.message}</p>
                    {statusResult.status === "approved" && (
                      <a
                        href="/auth/login"
                        className="inline-block mt-4 text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline underline-offset-4 decoration-2 transition-colors"
                      >
                        Proceed to Login &rarr;
                      </a>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
