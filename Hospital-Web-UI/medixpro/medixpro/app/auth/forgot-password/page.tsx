"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [email, setEmail] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // For demo purposes, show success message
      setIsSubmitted(true)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Clinic Management</h2>
          <p className="mt-2 text-gray-400">Reset your password</p>
        </div>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl text-white">Forgot password</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>

          {isSubmitted ? (
            <CardContent className="space-y-4">
              <Alert className="border-green-800 bg-green-900/20 text-green-400">
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>
                  We've sent a password reset link to {email}. Please check your inbox and follow the instructions.
                </AlertDescription>
              </Alert>
              <Button
                asChild
                variant="outline"
                className="mt-4 w-full border-gray-700 bg-transparent text-white hover:bg-gray-800 hover:text-white"
              >
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && <div className="rounded-md bg-red-900/20 p-3 text-sm text-red-400">{error}</div>}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-gray-800 bg-gray-800 pl-10 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? "Sending reset link..." : "Send reset link"}
                </Button>
                <Button asChild variant="ghost" className="w-full text-gray-400 hover:bg-gray-800 hover:text-white">
                  <Link href="/auth/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Link>
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
