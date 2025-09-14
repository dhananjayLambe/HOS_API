"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, InfoIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const deathRecordSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.date({ required_error: "Date of birth is required" }),
  age: z.coerce.number().min(0, { message: "Age must be a positive number" }),
  placeOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]),
  occupation: z.string().optional(),

  // Death Information
  dateOfDeath: z.date({ required_error: "Date of death is required" }),
  timeOfDeath: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Please enter a valid time (HH:MM)" }),
  placeOfDeath: z.string().min(2, { message: "Place of death must be at least 2 characters." }),
  causeOfDeath: z.string().min(2, { message: "Cause of death must be at least 2 characters." }),
  mannerOfDeath: z.enum(["natural", "accident", "suicide", "homicide", "undetermined", "pending"]),

  // Medical Information
  attendingPhysician: z.string().min(2, { message: "Attending physician must be at least 2 characters." }),
  medicalExaminer: z.string().optional(),
  autopsyPerformed: z.enum(["yes", "no", "pending"]),
  autopsyFindings: z.string().optional(),

  // Additional Information
  informantName: z.string().min(2, { message: "Informant name must be at least 2 characters." }),
  informantRelationship: z.string().min(2, { message: "Relationship must be at least 2 characters." }),
  informantContact: z.string().min(5, { message: "Contact information must be at least 5 characters." }),
  notes: z.string().optional(),
})

type DeathRecordFormValues = z.infer<typeof deathRecordSchema>

export default function AddDeathRecordPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("personal")

  const defaultValues: Partial<DeathRecordFormValues> = {
    gender: "male",
    maritalStatus: "single",
    mannerOfDeath: "natural",
    autopsyPerformed: "no",
  }

  const form = useForm<DeathRecordFormValues>({
    resolver: zodResolver(deathRecordSchema),
    defaultValues,
    mode: "onChange",
  })

  function onSubmit(data: DeathRecordFormValues) {
    console.log(data)
    // In a real application, you would save the data to your backend here
    router.push("/records/death")
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Add Death Record</h2>
          <p className="text-muted-foreground">Create a new death record in the system</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" form="death-record-form">
            Save Record
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form id="death-record-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList >
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="death">Death Details</TabsTrigger>
              <TabsTrigger value="medical">Medical Info</TabsTrigger>
              <TabsTrigger value="additional">Additional Info</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Enter the deceased person's personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Birth</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age at Death</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="placeOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Place of Birth</FormLabel>
                          <FormControl>
                            <Input placeholder="City, Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. American" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Last Known Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter full address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="divorced">Divorced</SelectItem>
                              <SelectItem value="widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Engineer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setActiveTab("death")}>
                      Next: Death Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="death" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Death Information</CardTitle>
                  <CardDescription>Enter details about the death</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="dateOfDeath"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Death</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeOfDeath"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time of Death</FormLabel>
                          <FormControl>
                            <Input placeholder="HH:MM" {...field} />
                          </FormControl>
                          <FormDescription>Use 24-hour format (e.g., 14:30)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="placeOfDeath"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Place of Death</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. City General Hospital" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="causeOfDeath"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            <span className="flex items-center gap-2">
                              Immediate Cause of Death
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">The final disease or condition resulting in death</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the immediate cause of death" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mannerOfDeath"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Manner of Death</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="natural" />
                                </FormControl>
                                <FormLabel className="font-normal">Natural</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="accident" />
                                </FormControl>
                                <FormLabel className="font-normal">Accident</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="suicide" />
                                </FormControl>
                                <FormLabel className="font-normal">Suicide</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="homicide" />
                                </FormControl>
                                <FormLabel className="font-normal">Homicide</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="undetermined" />
                                </FormControl>
                                <FormLabel className="font-normal">Undetermined</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="pending" />
                                </FormControl>
                                <FormLabel className="font-normal">Pending Investigation</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("personal")}>
                      Previous: Personal Info
                    </Button>
                    <Button type="button" onClick={() => setActiveTab("medical")}>
                      Next: Medical Info
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>Enter medical details related to the death</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="attendingPhysician"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attending Physician</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Jane Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicalExaminer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Examiner/Coroner</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autopsyPerformed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Autopsy Performed</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autopsyFindings"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Autopsy Findings</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter autopsy findings if applicable"
                              {...field}
                              disabled={form.watch("autopsyPerformed") === "no"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("death")}>
                      Previous: Death Details
                    </Button>
                    <Button type="button" onClick={() => setActiveTab("additional")}>
                      Next: Additional Info
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="additional" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                  <CardDescription>Enter informant details and additional notes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="informantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Informant Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name of informant" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="informantRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship to Deceased</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Spouse, Child" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="informantContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Informant Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone or email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any additional information" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("medical")}>
                      Previous: Medical Info
                    </Button>
                    <Button type="submit">Submit Death Record</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}
