"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { MapPin, Navigation } from "lucide-react"

const addressDetailsSchema = z.object({
  address: z.string().min(5, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

type AddressDetailsForm = z.infer<typeof addressDetailsSchema>

interface AddressDetailsStepProps {
  data?: Partial<AddressDetailsForm>
  onNext: (data: AddressDetailsForm) => void
  onBack: () => void
}

export function AddressDetailsStep({ data, onNext, onBack }: AddressDetailsStepProps) {
  const form = useForm<AddressDetailsForm>({
    // ⚠️ IMPORTANT: VALIDATION IS TEMPORARILY DISABLED FOR TESTING
    // TODO: Uncomment the zodResolver line below to re-enable form validation
    resolver: zodResolver(addressDetailsSchema),
    defaultValues: {
      address: data?.address ?? "",
      address2: data?.address2 ?? "",
      city: data?.city ?? "",
      state: data?.state ?? "",
      pincode: data?.pincode ?? "",
      latitude: data?.latitude,
      longitude: data?.longitude,
    },
  })

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("latitude", position.coords.latitude)
          form.setValue("longitude", position.coords.longitude)
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground">Address Details</h3>
        <p className="mt-1 text-sm text-muted-foreground">Provide the location of your diagnostic laboratory</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Address Line 1 <span className="text-destructive text-red-500">*</span>
                </FormLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="123 Main Street" className="pl-10" {...field} />
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
                <FormLabel>Address Line 2</FormLabel>
                <Input placeholder="Suite, Building, Floor" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    City <span className="text-destructive text-red-500">*</span>
                  </FormLabel>
                  <Input placeholder="Mumbai" {...field} />
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
                    State <span className="text-destructive text-red-500">*</span>
                  </FormLabel>
                  <Input placeholder="Maharashtra" {...field} />
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
                  Pincode <span className="text-destructive text-red-500">*</span>
                </FormLabel>
                <Input placeholder="400001" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Location Coordinates</p>
                <p className="text-xs text-muted-foreground">Optional: Helps patients find you easily</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={detectLocation}>
                <Navigation className="mr-2 h-4 w-4" />
                Detect Location
              </Button>
            </div>
            {form.watch("latitude") && form.watch("longitude") && (
              <p className="mt-2 text-xs text-muted-foreground">
                Coordinates: {form.watch("latitude")?.toFixed(6)}, {form.watch("longitude")?.toFixed(6)}
              </p>
            )}
          </div>

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
