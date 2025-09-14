"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Edit, FileText, RefreshCw, User, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
    refillHistory: [{ date: "2023-08-15", pharmacist: "Jane Wilson", pharmacy: "MedixPro Pharmacy" }],
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
    refillHistory: [],
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
    refillHistory: [{ date: "2023-07-28", pharmacist: "Mark Johnson", pharmacy: "City Pharmacy" }],
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
    refillHistory: [],
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
    refillHistory: [],
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
    refillHistory: [
      { date: "2023-07-20", pharmacist: "Susan Lee", pharmacy: "HealthPlus Pharmacy" },
      { date: "2023-08-20", pharmacist: "Susan Lee", pharmacy: "HealthPlus Pharmacy" },
    ],
    diagnosis: "Hypertension, Osteoarthritis",
    notes: "Patient should monitor blood pressure regularly and continue with physical therapy.",
  },
];

export default function PrescriptionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const prescription = prescriptions.find((p) => p.id === id);

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Prescription Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Prescription Information</CardTitle>
                <CardDescription>Details about this prescription</CardDescription>
              </div>
              <Badge variant={prescription.status === "Active" ? "default" : "secondary"} className={prescription.status === "Active" ? "bg-green-500" : "bg-gray-500"}>
                {prescription.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prescription ID</p>
                  <p className="font-medium">{id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prescribed By</p>
                  <p className="font-medium">{prescription.doctor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{prescription.date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">{prescription.expiryDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                  <p className="font-medium">{prescription.diagnosis}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Refills Remaining</p>
                  <p className="font-medium">{prescription.refills}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Medications</h3>
                <div className="space-y-4">
                  {prescription.medications.map((medication, index) => (
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
                <p>{prescription.notes}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link href={`/prescriptions/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Prescription
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/prescriptions/${id}/renew`}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renew Prescription
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {prescription.refillHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Refill History</CardTitle>
                <CardDescription>History of prescription refills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {prescription.refillHistory.map((refill, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{refill.date}</p>
                        <p className="text-sm text-muted-foreground">{refill.pharmacy}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Dispensed by</p>
                        <p className="font-medium">{refill.pharmacist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
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
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>DOB: {prescription.patient.dob}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/patients/details?id=${prescription.patient.id}`}>
                  <User className="mr-2 h-4 w-4" />
                  View Patient Profile
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/prescriptions/${id}/renew`}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renew Prescription
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/prescriptions/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Prescription
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Print Prescription
              </Button>
              <Button variant="destructive" className="w-full">
                <X className="mr-2 h-4 w-4" />
                Cancel Prescription
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
