"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, Info, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AddMedicinePage() {
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [manufacturingDate, setManufacturingDate] = useState<Date>();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap">
        <div className="flex items-center flex-wrap gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/pharmacy/medicines">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold mb-2">Add New Medicine</h2>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="details">Detailed Information</TabsTrigger>
          <TabsTrigger value="inventory">Inventory & Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details of the medicine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medicine-name">
                    Medicine Name <span className="text-red-500">*</span>
                  </Label>
                  <Input id="medicine-name" placeholder="Enter medicine name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generic-name">
                    Generic Name <span className="text-red-500">*</span>
                  </Label>
                  <Input id="generic-name" placeholder="Enter generic name" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medicine-category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger id="medicine-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="antibiotics">Antibiotics</SelectItem>
                      <SelectItem value="analgesics">Analgesics</SelectItem>
                      <SelectItem value="antidiabetics">Antidiabetics</SelectItem>
                      <SelectItem value="antihypertensives">Antihypertensives</SelectItem>
                      <SelectItem value="antihistamines">Antihistamines</SelectItem>
                      <SelectItem value="nsaids">NSAIDs</SelectItem>
                      <SelectItem value="statins">Statins</SelectItem>
                      <SelectItem value="ppi">Proton Pump Inhibitors</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicine-type">
                    Medicine Type <span className="text-red-500">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger id="medicine-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="otc">Over The Counter (OTC)</SelectItem>
                      <SelectItem value="controlled">Controlled Substance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Enter medicine description" className="min-h-[100px]" />
              </div>

              <div className="space-y-2">
                <Label>
                  Medicine Form <span className="text-red-500">*</span>
                </Label>
                <RadioGroup defaultValue="tablet" className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tablet" id="tablet" />
                    <Label htmlFor="tablet">Tablet</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="capsule" id="capsule" />
                    <Label htmlFor="capsule">Capsule</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="syrup" id="syrup" />
                    <Label htmlFor="syrup">Syrup</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="injection" id="injection" />
                    <Label htmlFor="injection">Injection</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cream" id="cream" />
                    <Label htmlFor="cream">Cream/Ointment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="drops" id="drops" />
                    <Label htmlFor="drops">Drops</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other-form" />
                    <Label htmlFor="other-form">Other</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button>Next</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Information</CardTitle>
              <CardDescription>Enter detailed specifications of the medicine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input id="manufacturer" placeholder="Enter manufacturer name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" placeholder="Enter supplier name" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manufacturing-date">Manufacturing Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {manufacturingDate ? format(manufacturingDate, "PPP") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={manufacturingDate} onSelect={setManufacturingDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry-date">
                    Expiry Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "PPP") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="batch-number">Batch Number</Label>
                  <Input id="batch-number" placeholder="Enter batch number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input id="dosage" placeholder="e.g., 500mg, 5ml" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="side-effects">Side Effects</Label>
                <Textarea id="side-effects" placeholder="Enter potential side effects" className="min-h-[80px]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precautions">Precautions & Warnings</Label>
                <Textarea id="precautions" placeholder="Enter precautions and warnings" className="min-h-[80px]" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Previous</Button>
              <Button>Next</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory & Pricing</CardTitle>
              <CardDescription>Enter inventory and pricing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Initial Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input id="quantity" type="number" placeholder="Enter quantity" min="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorder-level">Reorder Level</Label>
                  <Input id="reorder-level" type="number" placeholder="Enter reorder level" min="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-level">Maximum Level</Label>
                  <Input id="max-level" type="number" placeholder="Enter maximum level" min="0" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="purchase-price">
                    Purchase Price <span className="text-red-500">*</span>
                  </Label>
                  <Input id="purchase-price" type="number" placeholder="Enter purchase price" min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling-price">
                    Selling Price <span className="text-red-500">*</span>
                  </Label>
                  <Input id="selling-price" type="number" placeholder="Enter selling price" min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input id="tax-rate" type="number" placeholder="Enter tax rate" min="0" max="100" step="0.01" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="mb-4 block">Storage Conditions</Label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="room-temp" />
                    <Label htmlFor="room-temp">Room Temperature</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="refrigerated" />
                    <Label htmlFor="refrigerated">Refrigerated</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="frozen" />
                    <Label htmlFor="frozen">Frozen</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="protect-light" />
                    <Label htmlFor="protect-light">Protect from Light</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upload Images</Label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <input type="file" className="hidden" id="medicine-image" accept="image/*" />
                    <label htmlFor="medicine-image" className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload medicine image</p>
                    </label>
                  </div>
                  <div>
                    <input type="file" className="hidden" id="package-image" accept="image/*" />
                    <label htmlFor="package-image" className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload package image</p>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="active" defaultChecked />
                <Label htmlFor="active">Active (Available for sale)</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Previous</Button>
              <Button type="submit">Save Medicine</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center rounded-md bg-blue-50 p-4 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
        <Info className="mr-2 size-5 shrink-0" />
        <p className="text-sm">
          Fields marked with <span className="text-red-500">*</span> are required. Make sure to fill all required fields before submitting.
        </p>
      </div>
    </div>
  );
}
