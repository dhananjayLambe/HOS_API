"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

export default function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(new Date());
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
  // In a real application, you would fetch the medicine data based on the ID
  // For this example, we'll use a mock medicine object
  const { id } = use(params);
  const medicine = {
    id: id,
    name: "Amoxicillin 500mg",
    generic: "Amoxicillin",
    category: "Antibiotics",
    type: "Prescription",
    manufacturer: "PharmaCorp Inc.",
    stock: 1250,
    batchNumber: "BAT20240315",
    expiryDate: "2025-06-15",
    purchaseDate: "2023-12-10",
    purchasePrice: 0.75,
    sellingPrice: 1.25,
    location: "Shelf A-12",
    status: "In Stock",
    description: "Amoxicillin is a penicillin antibiotic that fights bacteria. It is used to treat many different types of infection caused by bacteria, such as tonsillitis, bronchitis, pneumonia, and infections of the ear, nose, throat, skin, or urinary tract.",
    dosage: "One capsule three times daily, or as directed by physician.",
    sideEffects: "Diarrhea, nausea, vomiting, rash, allergic reactions in some patients.",
    contraindications: "Known hypersensitivity to penicillins or cephalosporins.",
    storage: "Store at room temperature between 15-30°C (59-86°F). Keep away from moisture and heat.",
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/pharmacy/medicines/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Edit Medicine</h1>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Details</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Information</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the basic details of this medicine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Medicine Name</Label>
                  <Input id="name" defaultValue={medicine.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generic">Generic Name</Label>
                  <Input id="generic" defaultValue={medicine.generic} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select defaultValue={medicine.category.toLowerCase()}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="antibiotics">Antibiotics</SelectItem>
                      <SelectItem value="analgesics">Analgesics</SelectItem>
                      <SelectItem value="antidiabetics">Antidiabetics</SelectItem>
                      <SelectItem value="antihypertensives">Antihypertensives</SelectItem>
                      <SelectItem value="antihistamines">Antihistamines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Medicine Type</Label>
                  <Select defaultValue={medicine.type.toLowerCase()}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="otc">OTC</SelectItem>
                      <SelectItem value="controlled">Controlled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input id="manufacturer" defaultValue={medicine.manufacturer} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Details</CardTitle>
              <CardDescription>Edit inventory and pricing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock">Current Stock</Label>
                  <Input id="stock" type="number" defaultValue={medicine.stock} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input id="batchNumber" defaultValue={medicine.batchNumber} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                        <span>{expiryDate ? expiryDate.toDateString() : "Pick a date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                        <span>{purchaseDate ? purchaseDate.toDateString() : "Pick a date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={purchaseDate} onSelect={setPurchaseDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                  <Input id="purchasePrice" type="number" step="0.01" defaultValue={medicine.purchasePrice} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling Price ($)</Label>
                  <Input id="sellingPrice" type="number" step="0.01" defaultValue={medicine.sellingPrice} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Input id="location" defaultValue={medicine.location} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue={medicine.status.toLowerCase().replace(/\s+/g, "-")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Information</CardTitle>
              <CardDescription>Edit medical details and usage information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} defaultValue={medicine.description} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage Instructions</Label>
                <Textarea id="dosage" rows={2} defaultValue={medicine.dosage} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sideEffects">Side Effects</Label>
                <Textarea id="sideEffects" rows={2} defaultValue={medicine.sideEffects} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contraindications">Contraindications</Label>
                <Textarea id="contraindications" rows={2} defaultValue={medicine.contraindications} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage">Storage Instructions</Label>
                <Textarea id="storage" rows={2} defaultValue={medicine.storage} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
