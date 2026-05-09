"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Building2, FileText } from "lucide-react"

const labDetailsSchema = z.object({
  organization_name: z.string().min(2, "Organization name is required"),
  display_name: z.string().min(2, "Display name is required"),
  lab_type: z.string().min(1, "Select a lab type"),
  license_number: z.string().optional(),
  registration_number: z.string().optional(),
  home_sample_collection: z.boolean(),
  walk_in_collection: z.boolean(),
})

export type LabDetailsForm = z.infer<typeof labDetailsSchema>

interface LabDetailsStepProps {
  data?: Partial<LabDetailsForm>
  onNext: (data: LabDetailsForm) => void
  onBack: () => void
}

const LAB_TYPES = [
  "Diagnostic Center",
  "Pathology Lab",
  "Radiology Center",
  "Clinic Lab",
  "Hospital Lab",
  "Multispeciality Diagnostics",
] as const

export function LabDetailsStep({ data, onNext, onBack }: LabDetailsStepProps) {
  const form = useForm<LabDetailsForm>({
    resolver: zodResolver(labDetailsSchema),
    defaultValues: {
      organization_name: data?.organization_name ?? "",
      display_name: data?.display_name ?? "",
      lab_type: data?.lab_type ?? "",
      license_number: data?.license_number ?? "",
      registration_number: data?.registration_number ?? "",
      home_sample_collection: data?.home_sample_collection ?? false,
      walk_in_collection: data?.walk_in_collection ?? true,
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">Lab Information</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">Basic details for your lab</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
          <FormField
            control={form.control}
            name="organization_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Organization name <span className="text-destructive">*</span>
                </FormLabel>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Registered legal name" className="pl-9" {...field} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Display name <span className="text-destructive">*</span>
                </FormLabel>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Name shown to patients" className="pl-9" {...field} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lab_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Lab type <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAB_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="home_sample_collection"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium">Home collection</FormLabel>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="walk_in_collection"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium">Walk-in available</FormLabel>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License number (optional)</FormLabel>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="If available" className="pl-9" {...field} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration number (optional)</FormLabel>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="If available" className="pl-9" {...field} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between pt-1">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" size="lg" className="min-w-28">
              Next
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
