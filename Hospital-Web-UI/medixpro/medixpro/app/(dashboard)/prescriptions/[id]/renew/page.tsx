"use client";

import type React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Calendar1, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// This would typically come from an API
const prescriptions = [
  {
    id: "1",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      dob: "1985-04-12",
      id: "PT10045",
    },
    doctor: "Dr. Sarah Johnson",
    date: "2023-07-15",
    expiryDate: "2023-10-15",
    status: "Active",
    medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: "3 months", notes: "Take with food" },
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily", duration: "3 months", notes: "Take after meals" },
    ],
    refills: 2,
    diagnosis: "Hypertension, Type 2 Diabetes",
    notes: "Patient responding well to current medication regimen. Blood pressure has stabilized.",
  },
  {
    id: "2",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
      dob: "1990-08-23",
      id: "PT10046",
    },
    doctor: "Dr. Michael Chen",
    date: "2023-07-10",
    expiryDate: "2023-10-10",
    status: "Active",
    medications: [{ name: "Atorvastatin", dosage: "20mg", frequency: "Once daily", duration: "3 months", notes: "Take at bedtime" }],
    refills: 3,
    diagnosis: "Hypercholesterolemia",
    notes: "Patient should continue with low cholesterol diet and regular exercise.",
  },
  {
    id: "3",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
      dob: "1978-11-30",
      id: "PT10047",
    },
    doctor: "Dr. Lisa Patel",
    date: "2023-06-28",
    expiryDate: "2023-09-28",
    status: "Expired",
    medications: [
      { name: "Prednisone", dosage: "5mg", frequency: "Once daily", duration: "3 months", notes: "Taper as directed" },
      {
        name: "Albuterol",
        dosage: "90mcg",
        frequency: "As needed",
        duration: "3 months",
        notes: "Use for shortness of breath",
      },
    ],
    refills: 0,
    diagnosis: "Asthma, Seasonal allergies",
    notes: "Patient should avoid known allergens and continue using preventative inhaler.",
  },
  {
    id: "4",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
      dob: "1995-03-17",
      id: "PT10048",
    },
    doctor: "Dr. James Wilson",
    date: "2023-07-05",
    expiryDate: "2023-07-12",
    status: "Expired",
    medications: [
      {
        name: "Amoxicillin",
        dosage: "500mg",
        frequency: "Three times daily",
        duration: "7 days",
        notes: "Complete full course",
      },
    ],
    refills: 0,
    diagnosis: "Bacterial sinusitis",
    notes: "Patient should follow up if symptoms do not improve after completing antibiotics.",
  },
  {
    id: "5",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
      dob: "1982-09-05",
      id: "PT10049",
    },
    doctor: "Dr. Emily Rodriguez",
    date: "2023-07-12",
    expiryDate: "2024-01-12",
    status: "Active",
    medications: [
      {
        name: "Sertraline",
        dosage: "50mg",
        frequency: "Once daily",
        duration: "6 months",
        notes: "Take in the morning",
      },
    ],
    refills: 5,
    diagnosis: "Generalized anxiety disorder",
    notes: "Patient should continue with therapy sessions alongside medication.",
  },
  {
    id: "6",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
      dob: "1970-12-10",
      id: "PT10050",
    },
    doctor: "Dr. Robert Kim",
    date: "2023-06-20",
    expiryDate: "2023-09-20",
    status: "Expired",
    medications: [
      {
        name: "Hydrochlorothiazide",
        dosage: "25mg",
        frequency: "Once daily",
        duration: "3 months",
        notes: "Take in the morning",
      },
      {
        name: "Ibuprofen",
        dosage: "600mg",
        frequency: "As needed",
        duration: "3 months",
        notes: "Take with food for pain",
      },
    ],
    refills: 0,
    diagnosis: "Hypertension, Osteoarthritis",
    notes: "Patient should monitor blood pressure regularly and continue with physical therapy.",
  },
];

export default function RenewPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const prescriptionData = prescriptions.find((p) => p.id === id);

  if (!prescriptionData) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h1 className="text-2xl font-bold mb-2">Prescription Not Found</h1>
        <p className="text-muted-foreground mb-4">The prescription you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/prescriptions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Prescriptions
          </Link>
        </Button>
      </div>
    );
  }

  // Calculate a new expiry date 3 months from today
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const initialRenewalData = {
    doctor: prescriptionData.doctor,
    date: formatDate(today),
    expiryDate: formatDate(threeMonthsLater),
    refills: 3,
    notes: "",
    keepSameMedications: true,
    medications: [...prescriptionData.medications],
  };

  const [renewalData, setRenewalData] = useState(initialRenewalData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the data to your API
    toast({
      title: "Prescription renewed",
      description: "The prescription has been successfully renewed.",
    });
    router.push(`/prescriptions/${id}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Renew Prescription</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Renewal Information</CardTitle>
                <CardDescription>Renew prescription for {prescriptionData.patient.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Prescribing Doctor</Label>                    
                    <Input id="doctor" value={renewalData.doctor} onChange={(e) => setRenewalData({ ...renewalData, doctor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Issue Date</Label>
                    <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal`}>
                        <span>{renewalData.date ? renewalData.date.toString() : "Pick a date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" onSelect={(date) => setRenewalData({ ...renewalData, date: date ? date.toString().split("T")[0] : "" })} />
                    </PopoverContent>
                  </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>                    
                    <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal`}>
                        <span>{renewalData.expiryDate ? renewalData.expiryDate.toString() : "Pick a date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" onSelect={(date) => setRenewalData({ ...renewalData, expiryDate: date ? date.toString().split("T")[0] : "" })} />
                    </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refills">Refills</Label>
                    <Input id="refills" type="number" min="0" value={renewalData.refills} onChange={(e) => setRenewalData({ ...renewalData, refills: Number.parseInt(e.target.value) })} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="keepSameMedications" checked={renewalData.keepSameMedications} onCheckedChange={(checked) => setRenewalData({ ...renewalData, keepSameMedications: checked as boolean })} />
                    <Label htmlFor="keepSameMedications">Keep the same medications and dosages</Label>
                  </div>

                  {!renewalData.keepSameMedications && (
                    <div className="pl-6 space-y-4">
                      <p className="text-sm text-muted-foreground">If you need to change medications or dosages, please use the Edit Prescription page instead.</p>
                      <Button type="button" variant="outline" asChild>
                        <Link href={`/prescriptions/${id}/edit`}>Go to Edit Prescription</Link>
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="notes">Renewal Notes</Label>
                  <Textarea id="notes" placeholder="Add any notes about this renewal..." value={renewalData.notes} onChange={(e) => setRenewalData({ ...renewalData, notes: e.target.value })} rows={4} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renew Prescription
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Original Prescription</CardTitle>
                <CardDescription>Details from the original prescription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Original Issue Date</p>
                    <p className="font-medium">{prescriptionData.date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Original Expiry Date</p>
                    <p className="font-medium">{prescriptionData.expiryDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                    <p className="font-medium">{prescriptionData.diagnosis}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Previous Refills</p>
                    <p className="font-medium">{prescriptionData.refills}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Medications</h3>
                  <div className="space-y-4">
                    {prescriptionData.medications.map((medication, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Medication</p>
                              <p className="font-medium">{medication.name}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Dosage</p>
                              <p className="font-medium">{medication.dosage}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                              <p className="font-medium">{medication.frequency}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Duration</p>
                              <p className="font-medium">{medication.duration}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">Notes</p>
                              <p className="font-medium">{medication.notes}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Notes</h3>
                  <p>{prescriptionData.notes}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={prescriptionData.patient.image || "/user-2.png"} alt={prescriptionData.patient.name} />
                    <AvatarFallback>{prescriptionData.patient.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{prescriptionData.patient.name}</h3>
                    <p className="text-muted-foreground">ID: {prescriptionData.patient.id}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar1 className="h-4 w-4 text-muted-foreground" />
                    <span>DOB: {prescriptionData.patient.dob}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
