"use client";

import type React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Save, Trash } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

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

export default function EditPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const prescriptionData = prescriptions.find((p) => p.id === id);

  const [prescription, setPrescription] = useState(
    prescriptionData
      ? {
          ...prescriptionData,
          medications: [...prescriptionData.medications],
        }
      : null
  );

  if (!prescription) {
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

  const handleMedicationChange = (index: number, field: string, value: string) => {
    const updatedMedications = [...prescription.medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value,
    };
    setPrescription({
      ...prescription,
      medications: updatedMedications,
    });
  };

  const addMedication = () => {
    setPrescription({
      ...prescription,
      medications: [...prescription.medications, { name: "", dosage: "", frequency: "", duration: "", notes: "" }],
    });
  };

  const removeMedication = (index: number) => {
    const updatedMedications = [...prescription.medications];
    updatedMedications.splice(index, 1);
    setPrescription({
      ...prescription,
      medications: updatedMedications,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the data to your API
    toast({
      title: "Prescription updated",
      description: "The prescription has been successfully updated.",
    });
    router.push(`/prescriptions/${id}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Prescription</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Prescription Information</CardTitle>
                <CardDescription>Edit the prescription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Prescribing Doctor</Label>
                    <Input id="doctor" value={prescription.doctor} onChange={(e) => setPrescription({ ...prescription, doctor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={prescription.status} onValueChange={(value) => setPrescription({ ...prescription, status: value })}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Issue Date</Label>
                    <Input id="date" type="date" value={prescription.date} onChange={(e) => setPrescription({ ...prescription, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" type="date" value={prescription.expiryDate} onChange={(e) => setPrescription({ ...prescription, expiryDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnosis</Label>
                    <Input id="diagnosis" value={prescription.diagnosis} onChange={(e) => setPrescription({ ...prescription, diagnosis: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refills">Refills</Label>
                    <Input id="refills" type="number" min="0" value={prescription.refills} onChange={(e) => setPrescription({ ...prescription, refills: Number.parseInt(e.target.value) })} />
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Medications</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Medication
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {prescription.medications.map((medication, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium">Medication {index + 1}</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeMedication(index)} disabled={prescription.medications.length === 1}>
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`med-name-${index}`}>Medication Name</Label>
                              <Input id={`med-name-${index}`} value={medication.name} onChange={(e) => handleMedicationChange(index, "name", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`med-dosage-${index}`}>Dosage</Label>
                              <Input id={`med-dosage-${index}`} value={medication.dosage} onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`med-frequency-${index}`}>Frequency</Label>
                              <Input id={`med-frequency-${index}`} value={medication.frequency} onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`med-duration-${index}`}>Duration</Label>
                              <Input id={`med-duration-${index}`} value={medication.duration} onChange={(e) => handleMedicationChange(index, "duration", e.target.value)} />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <Label htmlFor={`med-notes-${index}`}>Notes</Label>
                              <Textarea id={`med-notes-${index}`} value={medication.notes} onChange={(e) => handleMedicationChange(index, "notes", e.target.value)} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="notes">Prescription Notes</Label>
                  <Textarea id="notes" value={prescription.notes} onChange={(e) => setPrescription({ ...prescription, notes: e.target.value })} rows={4} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
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
                    <AvatarImage src={prescription.patient.image || "/user-2.png"} alt={prescription.patient.name} />
                    <AvatarFallback>{prescription.patient.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{prescription.patient.name}</h3>
                    <p className="text-muted-foreground">ID: {prescription.patient.id}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span>DOB: {prescription.patient.dob}</span>
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
