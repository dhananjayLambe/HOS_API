"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Department name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  headOfDepartment: z.string().min(1, {
    message: "Please select a head of department.",
  }),
  location: z.string().min(1, {
    message: "Location is required.",
  }),
  status: z.string().min(1, {
    message: "Please select a status.",
  }),
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  contactPhone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  services: z.array(z.string()).optional(),
  staff: z.array(z.string()).optional(),
});

export default function AddDepartmentPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      headOfDepartment: "",
      location: "",
      status: "active",
      contactEmail: "",
      contactPhone: "",
      services: [],
      staff: [],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // In a real application, you would submit this data to your backend
    alert("Department added successfully!");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Add Department</h2>
          <p className="text-muted-foreground">Create a new department in your clinic</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/departments">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Departments
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Information</CardTitle>
          <CardDescription>Enter the details for the new department</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cardiology" {...field} />
                      </FormControl>
                      <FormDescription>The official name of the department</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="headOfDepartment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Head of Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dr-sarah-johnson">Dr. Sarah Johnson</SelectItem>
                          <SelectItem value="dr-michael-chen">Dr. Michael Chen</SelectItem>
                          <SelectItem value="dr-emily-rodriguez">Dr. Emily Rodriguez</SelectItem>
                          <SelectItem value="dr-james-wilson">Dr. James Wilson</SelectItem>
                          <SelectItem value="dr-lisa-thompson">Dr. Lisa Thompson</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>The doctor who will lead this department</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Building A, Floor 3" {...field} />
                      </FormControl>
                      <FormDescription>Physical location of the department</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="planning">Planning</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Current operational status</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="department@clinic.com" {...field} />
                      </FormControl>
                      <FormDescription>Department contact email</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormDescription>Department contact phone</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Provide a description of the department's purpose, specialties, and functions..." className="min-h-[120px]" {...field} />
                        </FormControl>
                        <FormDescription>Detailed description of the department</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Assign Staff</h3>
                  <p className="text-sm text-muted-foreground">Select staff members to assign to this department</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {staffMembers.map((staff) => (
                    <FormField
                      key={staff.id}
                      control={form.control}
                      name="staff"
                      render={({ field }) => {
                        return (
                          <FormItem key={staff.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(staff.id)}
                                onCheckedChange={(checked) => {
                                  return checked ? field.onChange([...(field.value || []), staff.id]) : field.onChange(field.value?.filter((value) => value !== staff.id));
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium">{staff.name}</FormLabel>
                              <FormDescription className="text-xs">{staff.role}</FormDescription>
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Available Services</h3>
                  <p className="text-sm text-muted-foreground">Select services that will be offered by this department</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <FormField
                      key={service.id}
                      control={form.control}
                      name="services"
                      render={({ field }) => {
                        return (
                          <FormItem key={service.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(service.id)}
                                onCheckedChange={(checked) => {
                                  return checked ? field.onChange([...(field.value || []), service.id]) : field.onChange(field.value?.filter((value) => value !== service.id));
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium">{service.name}</FormLabel>
                              <FormDescription className="text-xs">{service.description}</FormDescription>
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="w-full md:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  Create Department
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

const staffMembers = [
  {
    id: "staff-1",
    name: "Dr. Sarah Johnson",
    role: "Cardiologist",
  },
  {
    id: "staff-2",
    name: "Dr. Michael Chen",
    role: "Neurologist",
  },
  {
    id: "staff-3",
    name: "Dr. Emily Rodriguez",
    role: "Pediatrician",
  },
  {
    id: "staff-4",
    name: "Nurse Robert Taylor",
    role: "Head Nurse",
  },
  {
    id: "staff-5",
    name: "Nurse Jessica Adams",
    role: "Registered Nurse",
  },
  {
    id: "staff-6",
    name: "Dr. James Wilson",
    role: "Orthopedic Surgeon",
  },
];

const services = [
  {
    id: "service-1",
    name: "General Consultation",
    description: "Initial patient assessment and diagnosis",
  },
  {
    id: "service-2",
    name: "Specialized Treatment",
    description: "Advanced procedures specific to department",
  },
  {
    id: "service-3",
    name: "Diagnostic Testing",
    description: "Comprehensive tests and screenings",
  },
  {
    id: "service-4",
    name: "Emergency Care",
    description: "Urgent medical attention",
  },
  {
    id: "service-5",
    name: "Follow-up Visits",
    description: "Post-treatment monitoring and care",
  },
  {
    id: "service-6",
    name: "Preventive Care",
    description: "Health maintenance and disease prevention",
  },
];
