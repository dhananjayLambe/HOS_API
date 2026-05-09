"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Phone, Mail, Briefcase } from "lucide-react"

const DESIGNATIONS = [
  "Owner",
  "Lab Admin",
  "Manager",
  "Pathologist",
  "Radiologist",
  "Receptionist",
  "Other",
] as const

const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  username: z.string().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit mobile number"),
  email: z
    .string()
    .optional()
    .refine((val) => !val || !val.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Enter a valid email address",
    }),
  designation: z.string().min(1, "Select your designation"),
  whatsapp_same_as_mobile: z.boolean(),
})

type ContactForm = z.infer<typeof contactSchema>

interface AdminDetailsStepProps {
  data?: Partial<ContactForm>
  onNext: (data: ContactForm) => void
}

export function AdminDetailsStep({ data, onNext }: AdminDetailsStepProps) {
  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: data?.first_name ?? "",
      last_name: data?.last_name ?? "",
      username: data?.username ?? "",
      email: data?.email ?? "",
      designation: data?.designation ?? "",
      whatsapp_same_as_mobile: data?.whatsapp_same_as_mobile ?? true,
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">Contact Details</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">Primary contact for your lab account</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First name <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="First name" className="pl-9" {...field} />
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
                  <FormLabel>Last name</FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Last name" className="pl-9" {...field} />
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
                  Mobile number (login / WhatsApp) <span className="text-destructive">*</span>
                </FormLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="9876543210"
                    className="pl-9"
                    inputMode="numeric"
                    maxLength={10}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
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
                <FormLabel>Email address (optional)</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="you@example.com" className="pl-9" {...field} />
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
                <FormLabel>
                  Designation <span className="text-destructive">*</span>
                </FormLabel>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3 top-2.5 z-10 h-4 w-4 text-muted-foreground" />
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className="pl-9">
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {DESIGNATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatsapp_same_as_mobile"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  id="wa-same"
                />
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="wa-same" className="cursor-pointer text-sm font-normal">
                    WhatsApp number same as mobile
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-1">
            <Button type="submit" size="lg" className="min-w-28">
              Next
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
