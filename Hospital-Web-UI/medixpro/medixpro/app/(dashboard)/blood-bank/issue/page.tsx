"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const bloodTypes = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

const departments = [
  { label: "Emergency", value: "emergency" },
  { label: "Surgery", value: "surgery" },
  { label: "Intensive Care", value: "intensive-care" },
  { label: "Pediatrics", value: "pediatrics" },
  { label: "Obstetrics", value: "obstetrics" },
  { label: "Oncology", value: "oncology" },
  { label: "Cardiology", value: "cardiology" },
  { label: "Neurology", value: "neurology" },
];

const doctors = [
  { label: "Dr. Sarah Johnson", value: "dr-sarah-johnson" },
  { label: "Dr. Michael Chen", value: "dr-michael-chen" },
  { label: "Dr. Emily Rodriguez", value: "dr-emily-rodriguez" },
  { label: "Dr. David Kim", value: "dr-david-kim" },
  { label: "Dr. Jessica Patel", value: "dr-jessica-patel" },
  { label: "Dr. Robert Wilson", value: "dr-robert-wilson" },
  { label: "Dr. Lisa Thompson", value: "dr-lisa-thompson" },
  { label: "Dr. James Anderson", value: "dr-james-anderson" },
];

const patients = [
  { label: "John Smith", value: "john-smith", bloodType: "A+" },
  { label: "Maria Garcia", value: "maria-garcia", bloodType: "O-" },
  { label: "Wei Chen", value: "wei-chen", bloodType: "B+" },
  { label: "Aisha Khan", value: "aisha-khan", bloodType: "AB+" },
  { label: "Robert Johnson", value: "robert-johnson", bloodType: "O+" },
  { label: "Sofia Hernandez", value: "sofia-hernandez", bloodType: "A-" },
  { label: "James Wilson", value: "james-wilson", bloodType: "B-" },
  { label: "Emma Davis", value: "emma-davis", bloodType: "AB-" },
];

const formSchema = z.object({
  recipientType: z.enum(["patient", "external"]),
  patientId: z.string().optional(),
  recipientName: z.string().optional(),
  recipientContact: z.string().optional(),
  bloodType: z.string({
    required_error: "Please select a blood type.",
  }),
  units: z.coerce
    .number()
    .min(1, {
      message: "Please enter at least 1 unit.",
    })
    .max(10, {
      message: "Maximum 10 units can be issued at once.",
    }),
  department: z.string({
    required_error: "Please select a department.",
  }),
  doctor: z.string({
    required_error: "Please select a doctor.",
  }),
  issueDate: z.date({
    required_error: "Please select a date.",
  }),
  purpose: z.string().min(5, {
    message: "Purpose must be at least 5 characters.",
  }),
  isEmergency: z.boolean().default(false),
  notes: z.string().optional(),
});

export default function IssuePage() {
  const router = useRouter();
  const [recipientType, setRecipientType] = useState<"patient" | "external">("patient");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipientType: "patient",
      units: 1,
      issueDate: new Date(),
      isEmergency: false,
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);

    toast({
      title: "Blood issued successfully",
      description: `${values.units} unit(s) of ${values.bloodType} blood has been issued.`,
    });

    // Redirect to the issued blood list page
    setTimeout(() => {
      router.push("/blood-bank/issued");
    }, 1500);
  }

  // Handle recipient type change
  const handleRecipientTypeChange = (value: "patient" | "external") => {
    setRecipientType(value);
    form.setValue("recipientType", value);

    // Reset related fields
    if (value === "patient") {
      form.setValue("recipientName", undefined);
      form.setValue("recipientContact", undefined);
    } else {
      form.setValue("patientId", undefined);
      setSelectedPatient(null);
    }
  };

  // Handle patient selection
  const handlePatientSelect = (value: string) => {
    setSelectedPatient(value);
    form.setValue("patientId", value);

    // Set blood type based on selected patient
    const patient = patients.find((p) => p.value === value);
    if (patient) {
      form.setValue("bloodType", patient.bloodType);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Issue Blood</h1>
          <p className="text-muted-foreground">Complete the form below to issue blood to a patient or external recipient.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blood Issue Form</CardTitle>
          <CardDescription>Fill out all required information to issue blood units.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Recipient Information */}
              <div>
                <h3 className="text-lg font-medium">Recipient Information</h3>
                <Separator className="my-4" />

                <div className="mb-6">
                  <FormLabel>Recipient Type</FormLabel>
                  <div className="flex gap-3 flex-wrap mt-2">
                    <Button type="button" variant={recipientType === "patient" ? "default" : "outline"} onClick={() => handleRecipientTypeChange("patient")}>
                      Hospital Patient
                    </Button>
                    <Button type="button" variant={recipientType === "external" ? "default" : "outline"} onClick={() => handleRecipientTypeChange("external")}>
                      External Recipient
                    </Button>
                  </div>
                </div>

                {recipientType === "patient" ? (
                  <div className="grid gap-6">
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Patient</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" role="combobox" className={cn("justify-between", !field.value && "text-muted-foreground")}>
                                  {field.value ? patients.find((patient) => patient.value === field.value)?.label : "Select patient"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                              <Command>
                                <CommandInput placeholder="Search patients..." />
                                <CommandList>
                                  <CommandEmpty>No patient found.</CommandEmpty>
                                  <CommandGroup>
                                    {patients.map((patient) => (
                                      <CommandItem key={patient.value} value={patient.value} onSelect={() => handlePatientSelect(patient.value)}>
                                        <Check className={cn("mr-2 h-4 w-4", patient.value === field.value ? "opacity-100" : "opacity-0")} />
                                        {patient.label} ({patient.bloodType})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="recipientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter recipient name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recipientContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Information</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone or email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Blood Information */}
              <div>
                <h3 className="text-lg font-medium">Blood Information</h3>
                <Separator className="my-4" />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bloodType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bloodTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                    name="units"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Units</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={10} placeholder="Enter number of units" {...field} />
                        </FormControl>
                        <FormDescription>Each unit is approximately 450ml</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Issue Details */}
              <div>
                <h3 className="text-lg font-medium">Issue Details</h3>
                <Separator className="my-4" />

                <div className="grid gap-6 sm:grid-cols-2">
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
                            {departments.map((department) => (
                              <SelectItem key={department.value} value={department.value}>
                                {department.label}
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
                    name="doctor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requesting Doctor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select doctor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {doctors.map((doctor) => (
                              <SelectItem key={doctor.value} value={doctor.value}>
                                {doctor.label}
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
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Issue Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isEmergency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Emergency Request</FormLabel>
                          <FormDescription>Mark this if the blood is needed for an emergency situation.</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the purpose of this blood issue" className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any additional information or special instructions" className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit">Issue Blood</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
