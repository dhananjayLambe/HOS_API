"use client"

import { use, useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { ArrowLeft, CalendarIcon, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for a single room allotment
const allotment = {
  id: "RA-001",
  patientName: "John Smith",
  patientId: "P-1001",
  patientAge: 45,
  patientGender: "Male",
  patientContact: "+1 (555) 123-4567",
  patientEmail: "john.smith@example.com",
  patientAddress: "123 Main St, Anytown, CA 12345",
  roomNumber: "301",
  roomType: "Private",
  roomFloor: "3rd Floor",
  department: "Cardiology",
  allotmentDate: new Date("2023-04-15"),
  allotmentTime: "10:30",
  expectedDischargeDate: new Date("2023-04-20"),
  actualDischargeDate: "",
  status: "occupied",
  doctor: "Dr. Emily Chen",
  doctorId: "D-2001",
  admissionReason: "Chest pain and shortness of breath",
  diagnosis: "Acute Myocardial Infarction",
  notes: "Patient requires regular monitoring of vital signs every 4 hours.",
  roomRate: 350,
  billingStatus: "Insurance Verified",
  insuranceProvider: "Blue Cross Blue Shield",
  insurancePolicyNumber: "BCBS-12345678",
}

// Form schema
const formSchema = z.object({
  patientName: z.string().min(2, { message: "Patient name is required" }),
  patientId: z.string().min(1, { message: "Patient ID is required" }),
  patientAge: z.coerce.number().min(0, { message: "Age must be a positive number" }),
  patientGender: z.string().min(1, { message: "Gender is required" }),
  patientContact: z.string().min(1, { message: "Contact number is required" }),
  patientEmail: z.string().email({ message: "Invalid email address" }),
  patientAddress: z.string().min(1, { message: "Address is required" }),
  roomNumber: z.string().min(1, { message: "Room number is required" }),
  roomType: z.string().min(1, { message: "Room type is required" }),
  department: z.string().min(1, { message: "Department is required" }),
  allotmentDate: z.date({ required_error: "Allotment date is required" }),
  allotmentTime: z.string().min(1, { message: "Allotment time is required" }),
  expectedDischargeDate: z.date({ required_error: "Expected discharge date is required" }),
  doctor: z.string().min(1, { message: "Doctor name is required" }),
  doctorId: z.string().min(1, { message: "Doctor ID is required" }),
  admissionReason: z.string().min(1, { message: "Admission reason is required" }),
  diagnosis: z.string().min(1, { message: "Diagnosis is required" }),
  notes: z.string().optional(),
  roomRate: z.coerce.number().min(0, { message: "Room rate must be a positive number" }),
  billingStatus: z.string().min(1, { message: "Billing status is required" }),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
})

export default function EditRoomAllotmentPage({ params }: { params: Promise<{ id: string }> }) {
  const {id} = use(params)
  const [date, setDate] = useState<Date>()

  // Initialize form with existing data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: allotment.patientName,
      patientId: allotment.patientId,
      patientAge: allotment.patientAge,
      patientGender: allotment.patientGender,
      patientContact: allotment.patientContact,
      patientEmail: allotment.patientEmail,
      patientAddress: allotment.patientAddress,
      roomNumber: allotment.roomNumber,
      roomType: allotment.roomType,
      department: allotment.department,
      allotmentDate: allotment.allotmentDate,
      allotmentTime: allotment.allotmentTime,
      expectedDischargeDate: allotment.expectedDischargeDate,
      doctor: allotment.doctor,
      doctorId: allotment.doctorId,
      admissionReason: allotment.admissionReason,
      diagnosis: allotment.diagnosis,
      notes: allotment.notes,
      roomRate: allotment.roomRate,
      billingStatus: allotment.billingStatus,
      insuranceProvider: allotment.insuranceProvider,
      insurancePolicyNumber: allotment.insurancePolicyNumber,
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real application, this would update the allotment in the database
    console.log(values)
    // Redirect to the allotment details page
    window.location.href = `/rooms/alloted/${id}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center flex-wrap gap-2">
          <Link href={`/rooms/alloted/${id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Edit Room Allotment</h2>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button type="submit" form="edit-allotment-form">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form id="edit-allotment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="patient-info" className="w-full">
            <TabsList>
              <TabsTrigger value="patient-info">Patient Information</TabsTrigger>
              <TabsTrigger value="room-details">Room Details</TabsTrigger>
              <TabsTrigger value="allotment-details">Allotment Details</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="patient-info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                  <CardDescription>Edit the patient's personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="patientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientGender"
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
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="patientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="room-details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Room Details</CardTitle>
                  <CardDescription>Edit the room assignment details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="roomNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roomType"
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
                              <SelectItem value="Private">Private</SelectItem>
                              <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="ICU">ICU</SelectItem>
                              <SelectItem value="NICU">NICU</SelectItem>
                              <SelectItem value="Emergency">Emergency</SelectItem>
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
                              <SelectItem value="Cardiology">Cardiology</SelectItem>
                              <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                              <SelectItem value="Neurology">Neurology</SelectItem>
                              <SelectItem value="Pulmonology">Pulmonology</SelectItem>
                              <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
                              <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                              <SelectItem value="Obstetrics">Obstetrics</SelectItem>
                              <SelectItem value="Oncology">Oncology</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roomRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Rate ($/day)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allotment-details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Allotment Details</CardTitle>
                  <CardDescription>Edit the allotment timing and medical details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="allotmentDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Allotment Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
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
                      name="allotmentTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allotment Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expectedDischargeDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expected Discharge Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date("1900-01-01")}
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
                      name="doctor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attending Doctor</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="doctorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doctor ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="admissionReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission Reason</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnosis</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>Edit the billing and insurance details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="billingStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select billing status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Insurance Verified">Insurance Verified</SelectItem>
                              <SelectItem value="Self Pay">Self Pay</SelectItem>
                              <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                              <SelectItem value="Insurance Denied">Insurance Denied</SelectItem>
                              <SelectItem value="Charity Care">Charity Care</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Provider</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>Leave blank if self-pay</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insurancePolicyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>Leave blank if self-pay</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => form.reset()}>
                    Reset
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}
