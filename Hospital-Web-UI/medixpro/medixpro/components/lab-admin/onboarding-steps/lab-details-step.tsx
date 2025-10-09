"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Building2, FileText, Award, Clock, X } from "lucide-react"
import { useState } from "react"

const labDetailsSchema = z.object({
  lab_name: z.string().min(2, "Lab name is required"),
  lab_type: z.string().min(1, "Please select a lab type"),
  license_number: z.string().optional(),
  license_valid_till: z.string().optional(),
  certifications: z.string().optional(),
  service_categories: z.array(z.string()).min(1, "Select at least one service"),
  home_sample_collection: z.boolean(),
  pricing_tier: z.enum(["Low", "Medium", "Premium"]),
  turnaround_time_hours: z.number().min(1).max(168),
})

type LabDetailsForm = z.infer<typeof labDetailsSchema>

interface LabDetailsStepProps {
  data?: Partial<LabDetailsForm>
  onNext: (data: LabDetailsForm) => void
  onBack: () => void
}

const serviceOptions = [
  "Blood Tests",
  "Urine Tests",
  "X-Ray",
  "CT Scan",
  "MRI",
  "Ultrasound",
  "ECG",
  "Pathology",
  "Microbiology",
  "Biochemistry",
]

export function LabDetailsStep({ data, onNext, onBack }: LabDetailsStepProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(data?.service_categories || [])

  const form = useForm<LabDetailsForm>({
    // ⚠️ IMPORTANT: VALIDATION IS TEMPORARILY DISABLED FOR TESTING
    // TODO: Uncomment the zodResolver line below to re-enable form validation
    resolver: zodResolver(labDetailsSchema),
    defaultValues: {
      lab_name: data?.lab_name ?? "",
      lab_type: data?.lab_type ?? "",
      license_number: data?.license_number ?? "",
      license_valid_till: data?.license_valid_till ?? "",
      certifications: data?.certifications ?? "",
      service_categories: data?.service_categories ?? [],
      home_sample_collection: data?.home_sample_collection ?? false,
      pricing_tier: data?.pricing_tier ?? "Medium",
      turnaround_time_hours: data?.turnaround_time_hours ?? 24,
    },
  })

  const toggleService = (service: string) => {
    const updated = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service]
    setSelectedServices(updated)
    form.setValue("service_categories", updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground">Lab Details</h3>
        <p className="mt-1 text-sm text-muted-foreground">Provide information about your diagnostic laboratory</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="lab_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Lab Name <span className="text-destructive text-red-500">*</span>
                </FormLabel>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="City Diagnostic Center" className="pl-10" {...field} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="lab_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Lab Type <span className="text-destructive text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lab type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diagnostic Lab">Diagnostic Lab</SelectItem>
                      <SelectItem value="Pathology">Pathology</SelectItem>
                      <SelectItem value="Radiology">Radiology</SelectItem>
                      <SelectItem value="Multi-Specialty">Multi-Specialty</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="LIC123456" className="pl-10" {...field} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="license_valid_till"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Valid Till</FormLabel>
                  <Input type="date" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <div className="relative">
                    <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="NABL, ISO 9001" className="pl-10" {...field} />
                  </div>
                  <FormDescription>Comma-separated (e.g., NABL, ISO)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="service_categories"
            render={() => (
              <FormItem>
                <FormLabel>
                  Service Categories <span className="text-destructive text-red-500">*</span>
                </FormLabel>
                <div className="flex flex-wrap gap-2">
                  {serviceOptions.map((service) => (
                    <Badge
                      key={service}
                      variant={selectedServices.includes(service) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleService(service)}
                    >
                      {service}
                      {selectedServices.includes(service) && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="home_sample_collection"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Home Sample Collection</FormLabel>
                  <FormDescription>Do you offer home sample collection services?</FormDescription>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricing_tier"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Pricing Tier</FormLabel>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="Low" />
                    <FormLabel className="font-normal">Low - Budget-friendly pricing</FormLabel>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="Medium" />
                    <FormLabel className="font-normal">Medium - Standard market pricing</FormLabel>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="Premium" />
                    <FormLabel className="font-normal">Premium - High-end services</FormLabel>
                  </div>
                </RadioGroup>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="turnaround_time_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Turnaround Time (hours)</FormLabel>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="24"
                    className="pl-10"
                    {...field}
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <FormDescription>Average time to deliver test results</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" size="lg" className="min-w-32">
              Next
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
