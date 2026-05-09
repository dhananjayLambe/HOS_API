"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"

const addressDetailsSchema = z.object({
  address: z.string().min(5, "Address is required"),
  address2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode"),
})

type AddressDetailsForm = z.infer<typeof addressDetailsSchema>

interface AddressDetailsStepProps {
  data?: Partial<AddressDetailsForm>
  onNext: (data: AddressDetailsForm) => void
  onBack: () => void
}

export function AddressDetailsStep({ data, onNext, onBack }: AddressDetailsStepProps) {
  const form = useForm<AddressDetailsForm>({
    resolver: zodResolver(addressDetailsSchema),
    defaultValues: {
      address: data?.address ?? "",
      address2: data?.address2 ?? "",
      landmark: data?.landmark ?? "",
      city: data?.city ?? "",
      state: data?.state ?? "",
      pincode: data?.pincode ?? "",
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">Branch Address</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">Primary branch location</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Address line 1 <span className="text-destructive">*</span>
                </FormLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Street, building" className="pl-9" {...field} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address line 2 (optional)</FormLabel>
                <Input placeholder="Area, floor" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="landmark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Landmark (optional)</FormLabel>
                <Input placeholder="Near metro, temple, etc." {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    City <span className="text-destructive">*</span>
                  </FormLabel>
                  <Input placeholder="City" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    State <span className="text-destructive">*</span>
                  </FormLabel>
                  <Input placeholder="State" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Pincode <span className="text-destructive">*</span>
                </FormLabel>
                <Input
                  placeholder="400001"
                  inputMode="numeric"
                  maxLength={6}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <FormMessage />
              </FormItem>
            )}
          />

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
