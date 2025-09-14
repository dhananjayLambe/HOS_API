"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calculator, FileText, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

// Sample patients data
const patients = [
  {
    id: "P12345",
    name: "John Smith",
    image: "/colorful-abstract-shapes.png",
    dob: "1978-05-15",
    age: 45,
    gender: "Male",
    email: "john.smith@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main Street, Apt 4B, New York, NY 10001",
    insurance: {
      provider: "Blue Cross Blue Shield",
      policyNumber: "BCBS123456789",
      groupNumber: "GRP987654321",
      coverageType: "PPO",
    },
  },
  {
    id: "P23456",
    name: "Emily Davis",
    image: "/colorful-abstract-shapes.png",
    dob: "1990-08-22",
    age: 33,
    gender: "Female",
    email: "emily.davis@example.com",
    phone: "+1 (555) 234-5678",
    address: "456 Oak Avenue, San Francisco, CA 94102",
    insurance: {
      provider: "Aetna",
      policyNumber: "AET987654321",
      groupNumber: "GRP123456789",
      coverageType: "HMO",
    },
  },
  {
    id: "P34567",
    name: "Robert Wilson",
    image: "/user-3.png",
    dob: "1965-03-10",
    age: 58,
    gender: "Male",
    email: "robert.wilson@example.com",
    phone: "+1 (555) 345-6789",
    address: "789 Pine Street, Chicago, IL 60601",
    insurance: {
      provider: "UnitedHealthcare",
      policyNumber: "UHC567891234",
      groupNumber: "GRP456789123",
      coverageType: "PPO",
    },
  },
];

// Sample services and items
const services = [
  { id: "S001", name: "General Consultation", category: "Consultation", price: 150.0 },
  { id: "S002", name: "Specialist Consultation", category: "Consultation", price: 200.0 },
  { id: "S003", name: "Follow-up Consultation", category: "Consultation", price: 100.0 },
  { id: "S004", name: "Blood Test - Basic Panel", category: "Laboratory", price: 80.0 },
  { id: "S005", name: "Blood Test - Comprehensive Panel", category: "Laboratory", price: 150.0 },
  { id: "S006", name: "Urinalysis", category: "Laboratory", price: 50.0 },
  { id: "S007", name: "X-Ray - Chest", category: "Radiology", price: 200.0 },
  { id: "S008", name: "X-Ray - Extremity", category: "Radiology", price: 150.0 },
  { id: "S009", name: "ECG", category: "Cardiology", price: 120.0 },
  { id: "S010", name: "Physical Therapy Session", category: "Therapy", price: 100.0 },
  { id: "S011", name: "Vaccination - Flu", category: "Preventive", price: 45.0 },
  { id: "S012", name: "Vaccination - COVID-19", category: "Preventive", price: 0.0 },
  { id: "S013", name: "Dental Cleaning", category: "Dental", price: 120.0 },
  { id: "S014", name: "Dental X-Ray", category: "Dental", price: 80.0 },
];

// Sample payment methods
const paymentMethods = ["Credit Card", "Debit Card", "Cash", "Check", "Bank Transfer", "Insurance", "Patient Portal", "Payment Plan"];

export default function CreateInvoicePage() {
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [items, setItems] = useState([
    { id: 1, serviceId: "", description: "", quantity: 1, unitPrice: 0 },
    { id: 2, serviceId: "S004", description: "", quantity: 1, unitPrice: 80 },
  ]);

  const addItem = () => {
    const newItem = { id: items.length + 1, serviceId: "", description: "", quantity: 1, unitPrice: 0 };
    setItems([...items, newItem]);
  };

  const deleteItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof typeof items[0], value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'serviceId') {
          const service = services.find(s => s.id === value.toString());
          return { ...item, serviceId: value.toString(), unitPrice: service ? service.price : 0 };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const newSubtotal = calculateSubtotal();
    const newTax = newSubtotal * 0.08;
    const newTotal = newSubtotal + newTax;

    setSubtotal(newSubtotal);
    setTax(newTax);
    setTotal(newTotal);
  }, [items]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Create Invoice</h1>
          <p className="text-muted-foreground">Create a new invoice for a patient.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Enter the details for the new invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="invoice-number">Invoice Number</Label>
                    <Input id="invoice-number" defaultValue="INV-008" readOnly />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="invoice-date">Invoice Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                          <span>{invoiceDate ? invoiceDate.toDateString() : "Pick a date"}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="due-date">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                          <span>{dueDate ? dueDate.toDateString() : "Pick a date"}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-type">Invoice Type</Label>
                  <Select defaultValue="standard">
                    <SelectTrigger id="invoice-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Invoice</SelectItem>
                      <SelectItem value="insurance">Insurance Claim</SelectItem>
                      <SelectItem value="recurring">Recurring Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference / PO Number (Optional)</Label>
                  <Input id="reference" placeholder="Enter reference or PO number" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-lg font-medium">Items & Services</h3>
                  <Button size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px] text-right">Quantity</TableHead>
                      <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox id={`item-${item.id}`} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Select value={item.serviceId} onValueChange={(value) => updateItem(item.id, 'serviceId', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service or item" />
                              </SelectTrigger>
                              <SelectContent>
                                {services.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name} - ${service.price.toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input 
                              placeholder="Additional description" 
                              className="h-8" 
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            min="1" 
                            className="h-8 text-right"
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.unitPrice} 
                            min="0" 
                            step="0.01" 
                            className="h-8 text-right"
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteItem(item.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex flex-col items-end space-y-2">
                  <div className="flex w-full justify-between md:w-1/2">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex w-full justify-between md:w-1/2">
                    <span>Tax (8%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex w-full justify-between md:w-1/2">
                    <span>Discount:</span>
                    <span>-$0.00</span>
                  </div>
                  <Separator className="w-full md:w-1/2" />
                  <div className="flex w-full justify-between md:w-1/2">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" placeholder="Enter any additional notes for this invoice" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-terms">Payment Terms</Label>
                  <Select defaultValue="30days">
                    <SelectTrigger id="payment-terms">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due">Due on Receipt</SelectItem>
                      <SelectItem value="15days">Net 15 Days</SelectItem>
                      <SelectItem value="30days">Net 30 Days</SelectItem>
                      <SelectItem value="60days">Net 60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline">Save as Draft</Button>
            <Button>Create Invoice</Button>
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Select a patient for this invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Search patients...</span>
                    <Search className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search patients..." />
                    <CommandList>
                      <CommandEmpty>No patients found.</CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem key={patient.id} value={patient.name}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={patient.image || "/user-2.png"} alt={patient.name} />
                                <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{patient.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {patient.age} • {patient.gender}
                                </p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="p-4 border rounded-md">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="/colorful-abstract-shapes.png" alt="John Smith" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">John Smith</p>
                    <p className="text-sm text-muted-foreground">45 • Male • ID: P12345</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <p>Email: john.smith@example.com</p>
                  <p>Phone: +1 (555) 123-4567</p>
                  <p className="text-xs">Address: 123 Main Street, Apt 4B, New York, NY 10001</p>
                </div>
                <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                  View patient details
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insurance Information</CardTitle>
              <CardDescription>Patient's insurance details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-insurance">Bill to Insurance</Label>
                  <Switch id="use-insurance" defaultChecked />
                </div>

                <div className="p-4 border rounded-md">
                  <div className="space-y-1">
                    <p className="font-medium">Blue Cross Blue Shield</p>
                    <p className="text-sm">Policy #: BCBS123456789</p>
                    <p className="text-sm">Group #: GRP987654321</p>
                    <p className="text-sm">Coverage: PPO</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copay">Copay Amount</Label>
                <Input id="copay" type="number" placeholder="0.00" min="0" step="0.01" />
              </div>

              <div className="space-y-2">
                <Label>Coverage Verification</Label>
                <RadioGroup defaultValue="verified" className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="verified" id="verified" />
                    <Label htmlFor="verified">Verified</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pending" id="pending" />
                    <Label htmlFor="pending">Pending Verification</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not-covered" id="not-covered" />
                    <Label htmlFor="not-covered">Not Covered</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method mb-3 block">Accepted Payment Methods</Label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox id={`method-${method.toLowerCase().replace(/\s+/g, "-")}`} defaultChecked />
                      <Label htmlFor={`method-${method.toLowerCase().replace(/\s+/g, "-")}`}>{method}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="payment-plan">Offer Payment Plan</Label>
                  <Switch id="payment-plan" />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="sm" className="gap-1">
                  <Calculator className="h-4 w-4" />
                  Tax Calculator
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-4 w-4" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
