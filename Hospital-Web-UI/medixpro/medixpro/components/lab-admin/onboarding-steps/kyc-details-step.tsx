"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileCheck, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const kycDetailsSchema = z.object({
  kyc_document_type: z.string().optional(),
  kyc_document_number: z.string().optional(),
})

type KycDetailsForm = z.infer<typeof kycDetailsSchema>

interface KycDetailsStepProps {
  data?: Partial<KycDetailsForm>
  onNext: (data: KycDetailsForm) => void
  onBack: () => void
}

export function KycDetailsStep({ data, onNext, onBack }: KycDetailsStepProps) {
  const form = useForm<KycDetailsForm>({
    // ⚠️ IMPORTANT: VALIDATION IS TEMPORARILY DISABLED FOR TESTING
    // TODO: Uncomment the zodResolver line below to re-enable form validation
    resolver: zodResolver(kycDetailsSchema),
    defaultValues: {
      kyc_document_type: data?.kyc_document_type ?? "",
      kyc_document_number: data?.kyc_document_number ?? "",
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground">KYC Details</h3>
        <p className="mt-1 text-sm text-muted-foreground">Verification documents (optional but recommended)</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Providing KYC details helps us verify your lab faster and builds trust with patients. This information is kept
          confidential.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="kyc_document_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAN">PAN Card</SelectItem>
                    <SelectItem value="Aadhaar">Aadhaar Card</SelectItem>
                    <SelectItem value="GSTIN">GSTIN</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Select the type of document you want to provide</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="kyc_document_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Number</FormLabel>
                <div className="relative">
                  <FileCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Enter document number" className="pl-10" {...field} />
                </div>
                <FormDescription>Enter the document number without spaces</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" size="lg" className="min-w-32">
              Review
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
