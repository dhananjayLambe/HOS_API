"use client"

import { use, useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for a single room
const roomData = {
  id: "room-101",
  number: "101",
  type: "Private",
  department: "Cardiology",
  floor: "1st Floor",
  wing: "East Wing",
  features: ["Private Bathroom", "Window View", "TV", "WiFi", "Nurse Call System"],
  description: "Spacious private room with modern amenities and a view of the garden.",
  capacity: 1,
  size: "25 sq m",
  dailyRate: 350,
  status: "occupied",
  notes: "Room was renovated in January 2023. New furniture and medical equipment installed.",
}

// Form schema
const formSchema = z.object({
  number: z.string().min(1, "Room number is required"),
  type: z.string().min(1, "Room type is required"),
  department: z.string().min(1, "Department is required"),
  floor: z.string().min(1, "Floor is required"),
  wing: z.string().min(1, "Wing is required"),
  features: z.array(z.string()),
  description: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  size: z.string().optional(),
  dailyRate: z.coerce.number().min(0, "Daily rate must be a positive number"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

// Room features options
const featureOptions = [
  { id: "private-bathroom", label: "Private Bathroom" },
  { id: "window-view", label: "Window View" },
  { id: "tv", label: "TV" },
  { id: "wifi", label: "WiFi" },
  { id: "nurse-call", label: "Nurse Call System" },
  { id: "oxygen", label: "Oxygen Supply" },
  { id: "adjustable-bed", label: "Adjustable Bed" },
  { id: "wheelchair-access", label: "Wheelchair Accessible" },
  { id: "refrigerator", label: "Refrigerator" },
  { id: "extra-bed", label: "Extra Bed for Attendant" },
]

// Department options
const departmentOptions = [
  "Cardiology",
  "Orthopedics",
  "Neurology",
  "Pulmonology",
  "Gastroenterology",
  "Pediatrics",
  "Oncology",
  "Gynecology",
  "Urology",
  "Dermatology",
]

// Room type options
const roomTypeOptions = ["Private", "Semi-Private", "General", "ICU", "NICU", "Operating Room", "Recovery Room"]

export default function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { id } = use(params)

  // Initialize form with room data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: roomData.number,
      type: roomData.type,
      department: roomData.department,
      floor: roomData.floor,
      wing: roomData.wing,
      features: roomData.features,
      description: roomData.description,
      capacity: roomData.capacity,
      size: roomData.size,
      dailyRate: roomData.dailyRate,
      notes: roomData.notes,
    },
  })

  // Handle form submission
  function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    console.log(values)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      // Redirect to room details page
      window.location.href = `/rooms/departments/${id}`
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <Link
            href={`/rooms/departments/${id}`}
            className="flex items-center text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Room Details
          </Link>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Edit Room {roomData.number}</h2>
          <p className="text-muted-foreground">
            {roomData.department} Department • {roomData.floor} • {roomData.wing}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList >
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="features">Features & Amenities</TabsTrigger>
              <TabsTrigger value="billing">Billing & Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Room Information</CardTitle>
                  <CardDescription>Edit the basic details of the room</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter room number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select room type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roomTypeOptions.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departmentOptions.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                  {dept}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormDescription>Maximum number of patients</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="floor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Floor</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter floor" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wing</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter wing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Size</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 25 sq m" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter room description" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Features & Amenities</CardTitle>
                  <CardDescription>Select the features and amenities available in this room</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="features"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Room Features</FormLabel>
                          <FormDescription>Select all features that apply to this room</FormDescription>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {featureOptions.map((feature) => (
                            <FormField
                              key={feature.id}
                              control={form.control}
                              name="features"
                              render={({ field }) => {
                                return (
                                  <FormItem key={feature.id} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(feature.label)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, feature.label])
                                            : field.onChange(field.value?.filter((value) => value !== feature.label))
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{feature.label}</FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>Set the billing rates and additional notes for this room</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="dailyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormDescription>Standard daily rate for this room</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter any additional notes about this room"
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4">
            <Link href={`/rooms/departments/${id}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
