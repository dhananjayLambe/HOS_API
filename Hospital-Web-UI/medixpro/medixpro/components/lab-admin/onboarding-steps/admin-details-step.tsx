"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { User, Phone, Mail, Briefcase } from "lucide-react"

const adminDetailsSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().optional(),
  username: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  designation: z.string().optional(),
})

type AdminDetailsForm = z.infer<typeof adminDetailsSchema>

interface AdminDetailsStepProps {
  data?: Partial<AdminDetailsForm>
  onNext: (data: AdminDetailsForm) => void
}

export function AdminDetailsStep({ data, onNext }: AdminDetailsStepProps) {
  const form = useForm<AdminDetailsForm>({
    // ⚠️ IMPORTANT: VALIDATION IS TEMPORARILY DISABLED FOR TESTING
    // TODO: Uncomment the zodResolver line below to re-enable form validation
    resolver: zodResolver(adminDetailsSchema),
    defaultValues: {
      first_name: data?.first_name ?? "",
      last_name: data?.last_name ?? "",
      username: data?.username ?? "",
      email: data?.email ?? "",
      designation: data?.designation ?? "",
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground">Admin Details</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enter your personal information as the lab administrator</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First Name <span className="text-destructive text-red-500">*</span>
                  </FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="John" className="pl-10" {...field} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name <span className="text-destructive text-red-500">*</span>

                  </FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Doe" className="pl-10" {...field} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Mobile Number (Username) <span className="text-destructive text-red-500">*</span>
                </FormLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="9876543210" className="pl-10" {...field} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="john.doe@example.com" className="pl-10" {...field} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Lab Manager" className="pl-10" {...field} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" size="lg" className="min-w-32">
              Next
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
