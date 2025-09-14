"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample patients data
type Patient = {
  id: string;
  name: string;
  image: string;
  dob: string;
  age: number;
  gender: string;
  allergies: string[];
  conditions: string[];
};
const patients: Patient[] = [
  {
    id: "1",
    name: "John Smith",
    image: "/colorful-abstract-shapes.png",
    dob: "1978-05-15",
    age: 45,
    gender: "Male",
    allergies: ["Penicillin", "Peanuts"],
    conditions: ["Hypertension", "Type 2 Diabetes"],
  },
  {
    id: "2",
    name: "Emily Davis",
    image: "/colorful-abstract-shapes.png",
    dob: "1990-08-22",
    age: 33,
    gender: "Female",
    allergies: ["Sulfa drugs"],
    conditions: ["Asthma"],
  },
  {
    id: "3",
    name: "Robert Wilson",
    image: "/user-3.png",
    dob: "1965-03-10",
    age: 58,
    gender: "Male",
    allergies: ["Aspirin"],
    conditions: ["Arthritis", "Hypertension"],
  },
  {
    id: "4",
    name: "Jane Doe",
    image: "/user-3.png",
    dob: "1965-03-10",
    age: 58,
    gender: "Female",
    allergies: ["Aspirin"],
    conditions: ["Arthritis", "Hypertension"],
  },
  {
    id: "5",
    name: "John Doe",
    image: "/user-3.png",
    dob: "1965-03-10",
    age: 58,
    gender: "Female",
    allergies: ["Aspirin"],
    conditions: ["Arthritis", "Hypertension"],
  },
];

// Sample medication templates
const medicationTemplates = [
  {
    id: "1",
    name: "Hypertension Standard",
    medications: [
      {
        name: "Lisinopril",
        dosage: "10mg",
        route: "Oral",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Take in the morning with or without food",
      },
      {
        name: "Hydrochlorothiazide",
        dosage: "12.5mg",
        route: "Oral",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Take in the morning with food",
      },
    ],
  },
  {
    id: "2",
    name: "Diabetes Type 2",
    medications: [
      {
        name: "Metformin",
        dosage: "500mg",
        route: "Oral",
        frequency: "Twice daily",
        duration: "30 days",
        instructions: "Take with meals",
      },
    ],
  },
  {
    id: "3",
    name: "Antibiotic - Respiratory",
    medications: [
      {
        name: "Amoxicillin",
        dosage: "500mg",
        route: "Oral",
        frequency: "Three times daily",
        duration: "7 days",
        instructions: "Take with or without food. Complete the full course.",
      },
    ],
  },
];
type Medication = {
  id: string;
  name: string;
  category: string;
  common_dosages: string[];
};
// Sample medications database
const medications: Medication[] = [
  { id: "1", name: "Lisinopril", category: "ACE Inhibitor", common_dosages: ["5mg", "10mg", "20mg"] },
  { id: "2", name: "Metformin", category: "Antidiabetic", common_dosages: ["500mg", "850mg", "1000mg"] },
  { id: "3", name: "Atorvastatin", category: "Statin", common_dosages: ["10mg", "20mg", "40mg", "80mg"] },
  { id: "4", name: "Amoxicillin", category: "Antibiotic", common_dosages: ["250mg", "500mg", "875mg"] },
  { id: "5", name: "Hydrochlorothiazide", category: "Diuretic", common_dosages: ["12.5mg", "25mg", "50mg"] },
  { id: "6", name: "Levothyroxine", category: "Thyroid", common_dosages: ["25mcg", "50mcg", "75mcg", "100mcg"] },
  { id: "7", name: "Amlodipine", category: "Calcium Channel Blocker", common_dosages: ["2.5mg", "5mg", "10mg"] },
  { id: "8", name: "Sertraline", category: "SSRI", common_dosages: ["25mg", "50mg", "100mg"] },
  { id: "9", name: "Ibuprofen", category: "NSAID", common_dosages: ["200mg", "400mg", "600mg", "800mg"] },
  { id: "10", name: "Omeprazole", category: "Proton Pump Inhibitor", common_dosages: ["10mg", "20mg", "40mg"] },
];

// Sample frequencies
const frequencies = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "Every 4 hours", "Every 6 hours", "Every 8 hours", "Every 12 hours", "As needed", "Before meals", "After meals", "At bedtime"];

// Sample routes
const routes = ["Oral", "Topical", "Subcutaneous", "Intramuscular", "Intravenous", "Inhaled", "Rectal", "Ophthalmic"];

export default function CreatePrescriptionPage() {
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(new Date());
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center flex-wrap gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/prescriptions">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Create Prescription</h2>
          <p className="text-muted-foreground">Create a new prescription for a patient.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Prescription Details</CardTitle>
              <CardDescription>Enter the details for the new prescription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="prescription-date">Prescription Date</Label>
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
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="prescription-type">Prescription Type</Label>
                    <Select defaultValue="standard">
                      <SelectTrigger id="prescription-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="controlled">Controlled Substance</SelectItem>
                        <SelectItem value="electronic">Electronic Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea id="diagnosis" placeholder="Enter diagnosis or reason for prescription" />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="use-template">Use Medication Template</Label>
                  <Select>
                    <SelectTrigger id="use-template" className="w-[260px]">
                      <SelectValue placeholder="Select template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicationTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Medications</h3>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Medication
                  </Button>
                </div>

                {/* Medication 1 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Medication #1</CardTitle>
                      <Button variant="ghost" size="icon" className="text-red-500">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 !pt-0">
                    <div className="space-y-2">
                      <Label htmlFor="medication-name-1">Medication Name</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            <span>{selectedMedication ? selectedMedication.name : "Select medication..."}</span>
                            <Search className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search medications..." />
                            <CommandList>
                              <CommandEmpty>No medications found.</CommandEmpty>
                              <CommandGroup>
                                {medications.map((medication) => (
                                  <CommandItem 
                                    key={medication.id} 
                                    value={medication.name} 
                                    onSelect={() => {
                                      setSelectedMedication(medication);
                                      // Close the popover after selection
                                      const popover = document.querySelector('[data-radix-popper-content-id]');
                                      if (popover) {
                                        popover.setAttribute('data-state', 'closed');
                                      }
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{medication.name}</span>
                                      <span className="text-xs text-muted-foreground">{medication.category}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dosage-1">Dosage</Label>
                        <Select>
                          <SelectTrigger id="dosage-1">
                            <SelectValue placeholder="Select dosage" />
                          </SelectTrigger>
                          <SelectContent>
                            {medications
                              .find((m) => m.name === "Lisinopril")
                              ?.common_dosages.map((dosage) => (
                                <SelectItem key={dosage} value={dosage}>
                                  {dosage}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="route-1">Route</Label>
                        <Select defaultValue="Oral">
                          <SelectTrigger id="route-1">
                            <SelectValue placeholder="Select route" />
                          </SelectTrigger>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem key={route} value={route}>
                                {route}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="frequency-1">Frequency</Label>
                        <Select>
                          <SelectTrigger id="frequency-1">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencies.map((frequency) => (
                              <SelectItem key={frequency} value={frequency}>
                                {frequency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration-1">Duration</Label>
                        <div className="flex gap-2">
                          <Input type="number" id="duration-1" placeholder="30" className="flex-1" />
                          <Select defaultValue="days">
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions-1">Special Instructions</Label>
                      <Textarea id="instructions-1" placeholder="Enter any special instructions for this medication" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch id="refills-1" />
                        <Label htmlFor="refills-1">Allow Refills</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="refill-count-1" className="text-sm">
                          Number of Refills:
                        </Label>
                        <Input type="number" id="refill-count-1" placeholder="0" className="w-16" min="0" max="12" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Medication 2 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Medication #2</CardTitle>
                      <Button variant="ghost" size="icon" className="text-red-500">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 !pt-0">
                    <div className="space-y-2">
                      <Label htmlFor="medication-name-2">Medication Name</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            <span>Metformin</span>
                            <Search className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search medications..." />
                            <CommandList>
                              <CommandEmpty>No medications found.</CommandEmpty>
                              <CommandGroup>
                                {medications.map((medication) => (
                                  <CommandItem key={medication.id} value={medication.name}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{medication.name}</span>
                                      <span className="text-xs text-muted-foreground">{medication.category}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dosage-2">Dosage</Label>
                        <Select defaultValue="500mg">
                          <SelectTrigger id="dosage-2">
                            <SelectValue placeholder="Select dosage" />
                          </SelectTrigger>
                          <SelectContent>
                            {medications
                              .find((m) => m.name === "Metformin")
                              ?.common_dosages.map((dosage) => (
                                <SelectItem key={dosage} value={dosage}>
                                  {dosage}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="route-2">Route</Label>
                        <Select defaultValue="Oral">
                          <SelectTrigger id="route-2">
                            <SelectValue placeholder="Select route" />
                          </SelectTrigger>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem key={route} value={route}>
                                {route}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="frequency-2">Frequency</Label>
                        <Select defaultValue="Twice daily">
                          <SelectTrigger id="frequency-2">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencies.map((frequency) => (
                              <SelectItem key={frequency} value={frequency}>
                                {frequency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration-2">Duration</Label>
                        <div className="flex gap-2">
                          <Input type="number" id="duration-2" defaultValue="30" className="flex-1" />
                          <Select defaultValue="days">
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions-2">Special Instructions</Label>
                      <Textarea id="instructions-2" defaultValue="Take with meals to reduce gastrointestinal side effects." />
                    </div>

                    <div className="flex items-center flex-wrap gap-3 justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch id="refills-2" defaultChecked />
                        <Label htmlFor="refills-2">Allow Refills</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="refill-count-2" className="text-sm">
                          Number of Refills:
                        </Label>
                        <Input type="number" id="refill-count-2" defaultValue="3" className="w-16" min="0" max="12" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for Pharmacist</Label>
                  <Textarea id="notes" placeholder="Enter any additional notes for the pharmacist" />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="save-template" />
                  <Label htmlFor="save-template">Save as Template</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input id="template-name" placeholder="Enter a name for this template" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline">Cancel</Button>
            <Button>Create Prescription</Button>
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Select a patient for this prescription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>{selectedPatient ? selectedPatient.name : "Search patients..."}</span>
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
                          <CommandItem key={patient.id} value={patient.name} onSelect={() => setSelectedPatient(patient)}>
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
                    <p className="text-sm text-muted-foreground">45 • Male • DOB: 1978-05-15</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium">Allergies:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs bg-red-500/10 text-red-800 px-2 py-1 rounded">Penicillin</span>
                      <span className="text-xs bg-red-500/10 text-red-800 px-2 py-1 rounded">Peanuts</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Conditions:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs bg-blue-500/10 text-blue-800 px-2 py-1 rounded">Hypertension</span>
                      <span className="text-xs bg-blue-500/10 text-blue-800 px-2 py-1 rounded">Type 2 Diabetes</span>
                    </div>
                  </div>
                </div>
                <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                  View patient details
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prescription History</CardTitle>
              <CardDescription>Recent prescriptions for this patient.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Lisinopril 10mg</p>
                      <p className="text-sm text-muted-foreground">Once daily • 30 days</p>
                      <p className="text-xs text-muted-foreground">Prescribed on: 2023-07-15</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Metformin 500mg</p>
                      <p className="text-sm text-muted-foreground">Twice daily • 30 days</p>
                      <p className="text-xs text-muted-foreground">Prescribed on: 2023-07-15</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Atorvastatin 20mg</p>
                      <p className="text-sm text-muted-foreground">Once daily at bedtime • 30 days</p>
                      <p className="text-xs text-muted-foreground">Prescribed on: 2023-08-22</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                View All Prescriptions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prescription Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prescription Format</Label>
                <RadioGroup defaultValue="electronic" className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="electronic" id="electronic" />
                    <Label htmlFor="electronic">Electronic Prescription</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="print" id="print" />
                    <Label htmlFor="print">Print Prescription</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">Both Electronic and Print</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="notify-patient" defaultChecked />
                <Label htmlFor="notify-patient">Notify Patient</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="urgent" />
                <Label htmlFor="urgent">Mark as Urgent</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
