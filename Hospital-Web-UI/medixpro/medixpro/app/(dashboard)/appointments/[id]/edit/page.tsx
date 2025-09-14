"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// This would normally come from a database
const getAppointment = (id: string) => {
  const appointments = [
    {
      id: "1",
      patient: {
        id: "p1",
        name: "John Smith",
      },
      doctor: {
        id: "d1",
        name: "Dr. Sarah Johnson",
      },
      date: "2023-07-15",
      time: "10:00 AM",
      endTime: "10:30 AM",
      status: "Confirmed",
      type: "Check-up",
      duration: "30 min",
      department: "General Medicine",
      room: "Room 103",
      notes: "Regular annual check-up. Patient has reported mild seasonal allergies.",
      reasonForVisit: "Annual physical examination",
    },
    {
      id: "2",
      patient: {
        id: "p2",
        name: "Emily Davis",
      },
      doctor: {
        id: "d2",
        name: "Dr. Michael Chen",
      },
      date: new Date().toISOString().split("T")[0], // Today's date
      time: "11:30 AM",
      endTime: "12:15 PM",
      status: "In Progress",
      type: "Consultation",
      duration: "45 min",
      department: "Cardiology",
      room: "Room 205",
      notes: "Follow-up on recent ECG results. Patient has been experiencing occasional chest pain.",
      reasonForVisit: "Chest pain evaluation",
    },
  ];

  const appointment = appointments.find((a) => a.id === id);
  if (!appointment) return null;
  return appointment;
};

// Get doctors list
const getDoctors = () => {
  return [
    { id: "d1", name: "Dr. Sarah Johnson", department: "General Medicine" },
    { id: "d2", name: "Dr. Michael Chen", department: "Cardiology" },
    { id: "d3", name: "Dr. Lisa Patel", department: "Orthopedics" },
    { id: "d4", name: "Dr. James Wilson", department: "Dental" },
    { id: "d5", name: "Dr. Emily Rodriguez", department: "Radiology" },
  ];
};

// Get departments list
const getDepartments = () => {
  return ["General Medicine", "Cardiology", "Orthopedics", "Dental", "Radiology", "Psychiatry", "Pediatrics", "Neurology"];
};

// Get appointment types
const getAppointmentTypes = () => {
  return ["Check-up", "Consultation", "Follow-up", "Dental Cleaning", "X-Ray", "Therapy Session", "Annual Physical", "Vaccination", "Emergency", "Surgery"];
};

// Form schema
const formSchema = z.object({
  date: z.string().min(1, { message: "Date is required" }),
  time: z.string().min(1, { message: "Time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  doctorId: z.string().min(1, { message: "Doctor is required" }),
  department: z.string().min(1, { message: "Department is required" }),
  type: z.string().min(1, { message: "Appointment type is required" }),
  duration: z.string().min(1, { message: "Duration is required" }),
  room: z.string().min(1, { message: "Room is required" }),
  reasonForVisit: z.string().min(1, { message: "Reason for visit is required" }),
  notes: z.string().optional(),
});

export default function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const appointment = getAppointment(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(new Date());
  const doctors = getDoctors();
  const departments = getDepartments();
  const appointmentTypes = getAppointmentTypes();

  // Initialize form with appointment data
  const defaultValues = appointment
    ? {
        date: appointment.date,
        time: appointment.time,
        endTime: appointment.endTime,
        doctorId: appointment.doctor.id,
        department: appointment.department,
        type: appointment.type,
        duration: appointment.duration,
        room: appointment.room,
        reasonForVisit: appointment.reasonForVisit,
        notes: appointment.notes,
      }
    : undefined;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
    mode: "onChange",
  });

  if (!appointment) {
    router.push("/appointments");
    return null;
  }

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Show success toast
    toast({
      title: "Appointment updated",
      description: "The appointment has been updated successfully.",
    });

    setIsSubmitting(false);

    // Redirect to appointment details
    router.push(`/appointments/${id}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/appointments/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to appointment details</span>
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Appointment</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Information</CardTitle>
          <CardDescription>
            Edit the appointment details for {appointment.patient.name} with {appointment.doctor.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button {...field} variant="outline" className={`w-full justify-start text-left font-normal `}>
                                <span>{appointmentDate ? appointmentDate.toDateString() : "Pick a date"}</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={appointmentDate} onSelect={setAppointmentDate} />
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15 min">15 minutes</SelectItem>
                              <SelectItem value="30 min">30 minutes</SelectItem>
                              <SelectItem value="45 min">45 minutes</SelectItem>
                              <SelectItem value="60 min">60 minutes</SelectItem>
                              <SelectItem value="90 min">90 minutes</SelectItem>
                              <SelectItem value="120 min">120 minutes</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <FormLabel>Doctor</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select doctor" />
                            </SelectTrigger>
                            <SelectContent>
                              {doctors.map((doctor) => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  {doctor.name} ({doctor.department})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
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
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((department) => (
                                <SelectItem key={department} value={department}>
                                  {department}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Type</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {appointmentTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="room"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reasonForVisit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Visit</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Textarea placeholder="Add any additional notes about the appointment" className="min-h-[120px]" {...field} />
                        </FormControl>
                        <FormDescription>Include any relevant information about the appointment.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="destructive" type="button">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cancel Appointment
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" asChild>
                    <Link href={`/appointments/${id}`}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
