"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Calendar1, Clock } from "lucide-react";
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
        image: "/colorful-abstract-shapes.png",
      },
      doctor: {
        id: "d1",
        name: "Dr. Sarah Johnson",
        image: "/user-3.png",
      },
      date: "2023-07-15",
      time: "10:00 AM",
      endTime: "10:30 AM",
      status: "Confirmed",
      type: "Check-up",
      duration: "30 min",
      department: "General Medicine",
      room: "Room 103",
    },
    {
      id: "2",
      patient: {
        id: "p2",
        name: "Emily Davis",
        image: "/colorful-abstract-shapes.png",
      },
      doctor: {
        id: "d2",
        name: "Dr. Michael Chen",
        image: "/user-3.png",
      },
      date: new Date().toISOString().split("T")[0], // Today's date
      time: "11:30 AM",
      endTime: "12:15 PM",
      status: "In Progress",
      type: "Consultation",
      duration: "45 min",
      department: "Cardiology",
      room: "Room 205",
    },
  ];

  const appointment = appointments.find((a) => a.id === id);
  if (!appointment) return null;
  return appointment;
};

// Form schema
const formSchema = z.object({
  date: z.string().min(1, { message: "Date is required" }),
  time: z.string().min(1, { message: "Time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  reason: z.string().min(1, { message: "Reason for rescheduling is required" }),
  notifyPatient: z.boolean().default(true),
  notifyDoctor: z.boolean().default(true),
});

export default function RescheduleAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const appointment = getAppointment(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(new Date());
  // Initialize form with appointment data, even if appointment is null
  const defaultValues = appointment
    ? {
        date: appointment.date,
        time: appointment.time,
        endTime: appointment.endTime,
        reason: "",
        notifyPatient: true,
        notifyDoctor: true,
      }
    : {
        date: "",
        time: "",
        endTime: "",
        reason: "",
        notifyPatient: true,
        notifyDoctor: true,
      };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
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
      title: "Appointment rescheduled",
      description: "The appointment has been rescheduled successfully.",
    });

    setIsSubmitting(false);

    // Redirect to appointment details
    router.push(`/appointments/${id}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/appointments/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to appointment details</span>
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Reschedule Appointment</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Reschedule Information</CardTitle>
            <CardDescription>Select a new date and time for the appointment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <Calendar1 className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-medium">Current Appointment</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at {appointment.time} - {appointment.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Date</FormLabel>
                          <FormControl>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Rescheduling</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Please provide a reason for rescheduling this appointment" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormDescription>This information will be used for record-keeping purposes.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2 pt-2">
                    <h3 className="font-medium">Notifications</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="notifyPatient" checked={form.watch("notifyPatient")} onChange={(e) => form.setValue("notifyPatient", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Label htmlFor="notifyPatient">Notify patient about the rescheduled appointment</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="notifyDoctor" checked={form.watch("notifyDoctor")} onChange={(e) => form.setValue("notifyDoctor", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Label htmlFor="notifyDoctor">Notify doctor about the rescheduled appointment</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-2 flex-wrap">
                  <Button variant="outline" type="button" asChild>
                    <Link href={`/appointments/${id}`}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Rescheduling...</>
                    ) : (
                      <>
                        <Calendar1 className="mr-2 h-4 w-4" />
                        Reschedule Appointment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={appointment.patient.image || "/user-2.png"} alt={appointment.patient.name} />
                  <AvatarFallback>{appointment.patient.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Patient</h3>
                  <p>{appointment.patient.name}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={appointment.doctor.image || "/user-2.png"} alt={appointment.doctor.name} />
                  <AvatarFallback>{appointment.doctor.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Doctor</h3>
                  <p>{appointment.doctor.name}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Duration</h3>
                    <p>{appointment.duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground mt-0.5">
                    <path d="M19 3v12h-5c-.023-3.681.184-7.406 5-12zm0 12v6h-1v-3M8 3v12h5c.023-3.681-.184-7.406-5-12zm0 12v6h1v-3" />
                  </svg>
                  <div>
                    <h3 className="font-semibold">Type</h3>
                    <p>{appointment.type}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground mt-0.5">
                    <path d="M3 21h18M9 8h1M9 12h1M9 16h1M15 8h1M15 12h1M15 16h1M14 3v4a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V3M5 21V7.6a.6.6 0 0 1 .6-.6h12.8a.6.6 0 0 1 .6.6V21" />
                  </svg>
                  <div>
                    <h3 className="font-semibold">Department</h3>
                    <p>{appointment.department}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground mt-0.5">
                    <path d="M3 3v18h18" />
                    <path d="M7 17v-5h2v5" />
                    <path d="M11 17v-9h2v9" />
                    <path d="M15 17v-3h2v3" />
                  </svg>
                  <div>
                    <h3 className="font-semibold">Room</h3>
                    <p>{appointment.room}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
