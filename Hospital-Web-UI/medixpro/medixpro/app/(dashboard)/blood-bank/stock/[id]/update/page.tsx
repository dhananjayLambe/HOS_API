"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Mock data for a blood unit
const bloodUnit = {
  id: "BS-001",
  bloodType: "A+",
  units: 12,
  collectionDate: "2023-04-15",
  expiryDate: "2023-05-15",
  status: "Available",
  location: "Refrigerator 1",
  donorId: "D-1045",
  donorName: "John Smith",
};

// Form schema
const formSchema = z.object({
  status: z.enum(["Available", "Reserved", "Issued", "Expired", "Discarded"]),
  location: z.string().min(1, { message: "Storage location is required" }),
  units: z.coerce.number().min(1, { message: "Units must be at least 1" }).max(20, { message: "Units cannot exceed 20" }),
  expiryDate: z.date({
    required_error: "Expiry date is required",
  }),
  reservedFor: z.string().optional(),
  issuedTo: z.string().optional(),
  issuedDepartment: z.string().optional(),
  discardReason: z.string().optional(),
  notes: z.string().optional(),
});

export default function UpdateBloodStockPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { id } = use(params);

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: bloodUnit.status as any,
      location: bloodUnit.location,
      units: bloodUnit.units,
      expiryDate: new Date(bloodUnit.expiryDate),
      notes: "",
    },
  });

  // Watch the status field to conditionally render fields
  const watchStatus = form.watch("status");

  // Handle form submission
  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      console.log(values);
      setIsSubmitting(false);
      toast({
        title: "Blood unit updated",
        description: `Blood unit ${id} has been updated successfully.`,
      });
      router.push(`/blood-bank/stock/${id}`);
    }, 1500);
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/blood-bank/stock/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Update Blood Unit</h2>
        <Badge variant="outline" className="ml-2 font-bold">
          {bloodUnit.bloodType}
        </Badge>
        <Badge variant={bloodUnit.status === "Available" ? "success" : bloodUnit.status === "Reserved" ? "secondary" : "warning"}>{bloodUnit.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blood Unit Information</CardTitle>
          <CardDescription>Update the status and details of blood unit {id}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Available" />
                            </FormControl>
                            <FormLabel className="font-normal">Available</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Reserved" />
                            </FormControl>
                            <FormLabel className="font-normal">Reserved</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Issued" />
                            </FormControl>
                            <FormLabel className="font-normal">Issued</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Expired" />
                            </FormControl>
                            <FormLabel className="font-normal">Expired</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Discarded" />
                            </FormControl>
                            <FormLabel className="font-normal">Discarded</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Location</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select storage location" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Refrigerator 1">Refrigerator 1</SelectItem>
                              <SelectItem value="Refrigerator 2">Refrigerator 2</SelectItem>
                              <SelectItem value="Refrigerator 3">Refrigerator 3</SelectItem>
                              <SelectItem value="Freezer 1">Freezer 1</SelectItem>
                              <SelectItem value="Freezer 2">Freezer 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="units"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Units</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Number of units available</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Conditional fields based on status */}
              {watchStatus === "Reserved" && (
                <FormField
                  control={form.control}
                  name="reservedFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reserved For</FormLabel>
                      <FormControl>
                        <Input placeholder="Patient name or ID" {...field} />
                      </FormControl>
                      <FormDescription>Enter the patient name or ID for whom this blood unit is reserved</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchStatus === "Issued" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="issuedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issued To</FormLabel>
                        <FormControl>
                          <Input placeholder="Patient name or ID" {...field} />
                        </FormControl>
                        <FormDescription>Enter the patient name or ID to whom this blood unit was issued</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issuedDepartment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issued Department</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="surgery">Surgery</SelectItem>
                            <SelectItem value="icu">Intensive Care Unit</SelectItem>
                            <SelectItem value="oncology">Oncology</SelectItem>
                            <SelectItem value="obstetrics">Obstetrics</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {watchStatus === "Discarded" && (
                <FormField
                  control={form.control}
                  name="discardReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Discard</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="contaminated">Contaminated</SelectItem>
                          <SelectItem value="damaged">Damaged during storage</SelectItem>
                          <SelectItem value="positive-test">Positive screening test</SelectItem>
                          <SelectItem value="quality-issue">Quality control issue</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any additional notes or comments about this update" className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button variant="outline" asChild>
                  <Link href={`/blood-bank/stock/${id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Blood Unit"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
