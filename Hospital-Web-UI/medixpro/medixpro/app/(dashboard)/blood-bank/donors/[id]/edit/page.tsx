"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Form schema
const donorFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  dateOfBirth: z.string(),
  gender: z.enum(["male", "female", "other"]),
  bloodType: z.string(),
  weight: z.string(),
  height: z.string(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  chronicConditions: z.string().optional(),
  previousSurgeries: z.string().optional(),
  isEligible: z.boolean().default(true),
  preferredContactMethod: z.enum(["email", "phone", "sms"]),
  consentToContact: z.boolean().default(true),
});

export default function EditDonorPage({ params }: { params: Promise<{ id: string }> }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dob, setDob] = useState<Date | undefined>(new Date());
  const { id } = use(params);
  // Mock data for donor
  const donor = {
    id: id,
    name: "John Smith",
    bloodType: "O+",
    phone: "+1 (555) 123-4567",
    email: "john.smith@example.com",
    address: "123 Main Street, Anytown, CA 12345",
    dateOfBirth: "1985-06-15",
    gender: "male",
    weight: "75",
    height: "180",
    allergies: "None",
    medications: "None",
    chronicConditions: "None",
    previousSurgeries: "Appendectomy (2010)",
    isEligible: true,
    preferredContactMethod: "email",
    consentToContact: true,
    image: null,
    initials: "JS",
  };

  // Initialize form with donor data
  const form = useForm<z.infer<typeof donorFormSchema>>({
    resolver: zodResolver(donorFormSchema),
    defaultValues: {
      name: donor.name,
      email: donor.email,
      phone: donor.phone,
      address: donor.address,
      dateOfBirth: donor.dateOfBirth,
      gender: donor.gender as any,
      bloodType: donor.bloodType,
      weight: donor.weight,
      height: donor.height,
      allergies: donor.allergies,
      medications: donor.medications,
      chronicConditions: donor.chronicConditions,
      previousSurgeries: donor.previousSurgeries,
      isEligible: donor.isEligible,
      preferredContactMethod: donor.preferredContactMethod as any,
      consentToContact: donor.consentToContact,
    },
  });

  function onSubmit(values: z.infer<typeof donorFormSchema>) {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      console.log(values);
      setIsSubmitting(false);
      // Redirect to donor details page
      window.location.href = `/blood-bank/donors/${id}`;
    }, 1000);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/blood-bank/donors/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Edit Donor</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-5">
            {/* Donor Profile Preview */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Donor Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={donor.image || "/user-2.png"} alt={donor.name} />
                  <AvatarFallback className="text-2xl">{donor.initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center space-y-1">
                  <h3 className="text-xl font-semibold">{form.watch("name")}</h3>
                  <Badge
                    variant="outline"
                    className={`
                      ${form.watch("bloodType").includes("O") ? "bg-red-500/10 text-red-500 border-red-500/20" : ""}
                      ${form.watch("bloodType").includes("A") ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}
                      ${form.watch("bloodType").includes("B") && !form.watch("bloodType").includes("A") ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
                      ${form.watch("bloodType").includes("AB") ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : ""}
                    `}
                  >
                    {form.watch("bloodType")}
                  </Badge>
                  <Badge variant={form.watch("isEligible") ? "success" : "destructive"}>{form.watch("isEligible") ? "Eligible" : "Ineligible"}</Badge>
                  <p className="text-sm text-muted-foreground">ID: {donor.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Donor Edit Form */}
            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle>Edit Donor Information</CardTitle>
                <CardDescription>Update the donor's personal and medical information</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList>
                    <TabsTrigger value="personal">Personal Information</TabsTrigger>
                    <TabsTrigger value="medical">Medical Information</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  </TabsList>

                  {/* Personal Information Tab */}
                  <TabsContent value="personal" className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                                    <span>{dob ? dob.toDateString() : "Pick a date"}</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={dob} onSelect={setDob} />
                                </PopoverContent>
                              </Popover>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Gender</FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="male" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Male</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="female" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Female</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="other" />
                                  </FormControl>
                                  <FormLabel className="font-normal">Other</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bloodType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blood Type</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select blood type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="O+">O+</SelectItem>
                                  <SelectItem value="O-">O-</SelectItem>
                                  <SelectItem value="A+">A+</SelectItem>
                                  <SelectItem value="A-">A-</SelectItem>
                                  <SelectItem value="B+">B+</SelectItem>
                                  <SelectItem value="B-">B-</SelectItem>
                                  <SelectItem value="AB+">AB+</SelectItem>
                                  <SelectItem value="AB-">AB-</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Full address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Medical Information Tab */}
                  <TabsContent value="medical" className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allergies</FormLabel>
                          <FormControl>
                            <Textarea placeholder="List any allergies or write 'None'" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Medications</FormLabel>
                          <FormControl>
                            <Textarea placeholder="List any current medications or write 'None'" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="chronicConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chronic Conditions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="List any chronic conditions or write 'None'" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="previousSurgeries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Surgeries</FormLabel>
                          <FormControl>
                            <Textarea placeholder="List any previous surgeries or write 'None'" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isEligible"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Eligible for Donation</FormLabel>
                            <FormDescription>Check if the donor is currently eligible to donate blood</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Preferences Tab */}
                  <TabsContent value="preferences" className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="preferredContactMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Preferred Contact Method</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="email" />
                                </FormControl>
                                <FormLabel className="font-normal">Email</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="phone" />
                                </FormControl>
                                <FormLabel className="font-normal">Phone Call</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="sms" />
                                </FormControl>
                                <FormLabel className="font-normal">SMS</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="consentToContact"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Consent to Contact</FormLabel>
                            <FormDescription>The donor has given consent to be contacted for future donation drives and updates</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href={`/blood-bank/donors/${id}`}>Cancel</Link>
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
              </CardFooter>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
