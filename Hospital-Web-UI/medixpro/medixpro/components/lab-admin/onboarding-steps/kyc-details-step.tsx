"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FileCheck } from "lucide-react"
import { validatePAN } from "@/lib/validation"

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error ?? new Error("Failed to read file"))
    fr.readAsDataURL(file)
  })
}

const complianceSchema = z
  .object({
    pan_number: z.string().optional(),
    gst_number: z.string().optional(),
    lab_license_file_name: z.string().optional(),
    nabl_certificate_file_name: z.string().optional(),
    lab_license_file_base64: z.string().optional(),
    nabl_certificate_file_base64: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const pan = val.pan_number?.trim().toUpperCase() ?? ""
    if (pan && !validatePAN(pan)) {
      ctx.addIssue({ code: "custom", message: "Invalid PAN format", path: ["pan_number"] })
    }
    const gst = val.gst_number?.trim().toUpperCase() ?? ""
    if (gst && !GSTIN_REGEX.test(gst)) {
      ctx.addIssue({ code: "custom", message: "Invalid GST number (15-character GSTIN)", path: ["gst_number"] })
    }
  })

export type ComplianceForm = z.infer<typeof complianceSchema>

interface KycDetailsStepProps {
  data?: Partial<ComplianceForm>
  onNext: (data: ComplianceForm) => void
  onBack: () => void
}

export function KycDetailsStep({ data, onNext, onBack }: KycDetailsStepProps) {
  const form = useForm<ComplianceForm>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      pan_number: data?.pan_number ?? "",
      gst_number: data?.gst_number ?? "",
      lab_license_file_name: data?.lab_license_file_name ?? "",
      nabl_certificate_file_name: data?.nabl_certificate_file_name ?? "",
      lab_license_file_base64: data?.lab_license_file_base64 ?? "",
      nabl_certificate_file_base64: data?.nabl_certificate_file_base64 ?? "",
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">Compliance Documents (Optional)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Uploads are stored for admin review. You can skip files and add them later if needed.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
          <FormField
            control={form.control}
            name="pan_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PAN number</FormLabel>
                <div className="relative">
                  <FileCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ABCDE1234F"
                    className="pl-9 uppercase"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gst_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GST number</FormLabel>
                <div className="relative">
                  <FileCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="15-character GSTIN"
                    className="pl-9 uppercase"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lab_license_file_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lab license (PDF / image)</FormLabel>
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,application/pdf"
                  className="cursor-pointer"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) {
                      field.onChange("")
                      form.setValue("lab_license_file_base64", "")
                      return
                    }
                    field.onChange(f.name)
                    void readFileAsDataUrl(f)
                      .then((dataUrl) => {
                        form.setValue("lab_license_file_base64", dataUrl, { shouldValidate: true })
                      })
                      .catch(() => {
                        form.setError("lab_license_file_name", { message: "Could not read file. Try another file." })
                        field.onChange("")
                        form.setValue("lab_license_file_base64", "")
                      })
                  }}
                />
                {field.value ? (
                  <p className="text-xs text-muted-foreground">Selected: {field.value}</p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nabl_certificate_file_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NABL certificate (PDF / image)</FormLabel>
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,application/pdf"
                  className="cursor-pointer"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) {
                      field.onChange("")
                      form.setValue("nabl_certificate_file_base64", "")
                      return
                    }
                    field.onChange(f.name)
                    void readFileAsDataUrl(f)
                      .then((dataUrl) => {
                        form.setValue("nabl_certificate_file_base64", dataUrl, { shouldValidate: true })
                      })
                      .catch(() => {
                        form.setError("nabl_certificate_file_name", {
                          message: "Could not read file. Try another file.",
                        })
                        field.onChange("")
                        form.setValue("nabl_certificate_file_base64", "")
                      })
                  }}
                />
                {field.value ? (
                  <p className="text-xs text-muted-foreground">Selected: {field.value}</p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-1">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" size="lg" className="min-w-28">
              Review
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
