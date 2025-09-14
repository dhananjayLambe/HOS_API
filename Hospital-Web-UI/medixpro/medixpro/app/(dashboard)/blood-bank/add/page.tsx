"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const bloodGroups = [
  { value: "a_positive", label: "A+" },
  { value: "a_negative", label: "A-" },
  { value: "b_positive", label: "B+" },
  { value: "b_negative", label: "B-" },
  { value: "ab_positive", label: "AB+" },
  { value: "ab_negative", label: "AB-" },
  { value: "o_positive", label: "O+" },
  { value: "o_negative", label: "O-" },
];

const sourceTypes = [
  { value: "donation", label: "Donation" },
  { value: "purchase", label: "Purchase" },
  { value: "transfer", label: "Transfer from another facility" },
];

const formSchema = z.object({
  donorId: z.string().optional(),
  donorName: z
    .string()
    .min(2, {
      message: "Donor name must be at least 2 characters.",
    })
    .optional(),
  bloodGroup: z.string({
    required_error: "Please select a blood group.",
  }),
  quantity: z.coerce.number().min(1, {
    message: "Quantity must be at least 1 unit.",
  }),
  collectionDate: z.date({
    required_error: "Collection date is required.",
  }),
  expiryDate: z.date({
    required_error: "Expiry date is required.",
  }),
  sourceType: z.string({
    required_error: "Please select a source type.",
  }),
  sourceDetails: z.string().optional(),
  location: z.string().optional(),
  screeningComplete: z.boolean().default(false),
  processingComplete: z.boolean().default(false),
  notes: z.string().optional(),
});

export default function AddBloodUnitPage() {
  const router = useRouter();
  const [isAnonymousDonor, setIsAnonymousDonor] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      screeningComplete: false,
      processingComplete: false,
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real application, you would submit this data to your backend
    console.log(values);

    toast({
      title: "Blood unit added successfully",
      description: `Added ${values.quantity} unit(s) of ${values.bloodGroup} blood.`,
    });

    // Redirect to the blood stock page after successful submission
    setTimeout(() => {
      router.push("/blood-bank/stock");
    }, 1500);
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Add Blood Unit</h1>
          <p className="text-muted-foreground">Add a new blood unit to the blood bank inventory</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blood Unit Information</CardTitle>
          <CardDescription>Enter the details of the new blood unit to be added to the inventory.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anonymous"
                      checked={isAnonymousDonor}
                      onCheckedChange={(checked) => {
                        setIsAnonymousDonor(checked === true);
                        if (checked) {
                          form.setValue("donorId", "ANONYMOUS");
                          form.setValue("donorName", "Anonymous Donor");
                        } else {
                          form.setValue("donorId", "");
                          form.setValue("donorName", "");
                        }
                      }}
                    />
                    <label htmlFor="anonymous" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Anonymous Donor
                    </label>
                  </div>

                  {!isAnonymousDonor && (
                    <>
                      <FormField
                        control={form.control}
                        name="donorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Donor ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter donor ID" {...field} />
                            </FormControl>
                            <FormDescription>Enter the unique ID of the donor.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="donorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Donor Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter donor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bloodGroups.map((group) => (
                              <SelectItem key={group.value} value={group.value}>
                                {group.label}
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
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity (units)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormDescription>Standard unit is 450ml of whole blood.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="collectionDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Collection Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || date < new Date("1900-01-01")} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Typically 35-42 days after collection for whole blood.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sourceTypes.map((source) => (
                              <SelectItem key={source.value} value={source.value}>
                                {source.label}
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collection Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter collection location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="screeningComplete"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Screening Complete</FormLabel>
                          <FormDescription>Blood has been screened for infectious diseases.</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="processingComplete"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Processing Complete</FormLabel>
                          <FormDescription>Blood has been processed and is ready for storage.</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter any additional information about this blood unit" className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end px-0">
                <Button type="submit" className="w-full md:w-auto">
                  Add Blood Unit
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
