"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowLeft, Copy, Edit, Printer, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

// Sample medication templates (in a real app, this would come from an API)
const medicationTemplates = [
  {
    id: "1",
    name: "Hypertension Standard",
    category: "Cardiovascular",
    description: "Standard treatment protocol for hypertension management in adults.",
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
    createdBy: "Dr. Sarah Johnson",
    createdOn: "2023-05-10",
    lastUsed: "2024-03-15",
    usageCount: 42,
  },
  {
    id: "2",
    name: "Diabetes Type 2",
    category: "Endocrine",
    description: "First-line treatment for Type 2 Diabetes patients.",
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
    createdBy: "Dr. Michael Chen",
    createdOn: "2023-06-22",
    lastUsed: "2024-04-02",
    usageCount: 38,
  },
  {
    id: "3",
    name: "Antibiotic - Respiratory",
    category: "Infectious Disease",
    description: "For treatment of mild to moderate respiratory infections.",
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
    createdBy: "Dr. Lisa Patel",
    createdOn: "2023-07-15",
    lastUsed: "2024-03-28",
    usageCount: 27,
  },
  {
    id: "4",
    name: "Pain Management - Mild",
    category: "Pain Management",
    description: "For management of mild to moderate pain.",
    medications: [
      {
        name: "Ibuprofen",
        dosage: "400mg",
        route: "Oral",
        frequency: "Every 6 hours as needed",
        duration: "7 days",
        instructions: "Take with food. Do not exceed 1600mg in 24 hours.",
      },
      {
        name: "Acetaminophen",
        dosage: "500mg",
        route: "Oral",
        frequency: "Every 6 hours as needed",
        duration: "7 days",
        instructions: "Do not exceed 4000mg in 24 hours.",
      },
    ],
    createdBy: "Dr. James Wilson",
    createdOn: "2023-08-05",
    lastUsed: "2024-04-10",
    usageCount: 31,
  },
  {
    id: "5",
    name: "Asthma Management",
    category: "Respiratory",
    description: "For management of mild to moderate asthma.",
    medications: [
      {
        name: "Albuterol",
        dosage: "90mcg",
        route: "Inhaled",
        frequency: "Every 4-6 hours as needed",
        duration: "30 days",
        instructions: "2 puffs every 4-6 hours as needed for shortness of breath.",
      },
      {
        name: "Fluticasone",
        dosage: "110mcg",
        route: "Inhaled",
        frequency: "Twice daily",
        duration: "30 days",
        instructions: "2 puffs twice daily. Rinse mouth after use.",
      },
    ],
    createdBy: "Dr. Emily Rodriguez",
    createdOn: "2023-09-12",
    lastUsed: "2024-03-20",
    usageCount: 24,
  },
  {
    id: "6",
    name: "Allergy - Seasonal",
    category: "Allergy",
    description: "For management of seasonal allergies.",
    medications: [
      {
        name: "Cetirizine",
        dosage: "10mg",
        route: "Oral",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Take in the evening. May cause drowsiness.",
      },
    ],
    createdBy: "Dr. Sarah Johnson",
    createdOn: "2023-10-08",
    lastUsed: "2024-04-05",
    usageCount: 19,
  },
];

export default function TemplateDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = use(params);
  useEffect(() => {
    // Simulate API call to fetch template details
    const fetchTemplate = () => {
      setLoading(true);
      setTimeout(() => {
        const foundTemplate = medicationTemplates.find((t) => t.id === id);
        if (foundTemplate) {
          setTemplate(foundTemplate);
          setError(null);
        } else {
          setError("Template not found");
        }
        setLoading(false);
      }, 500); // Simulate network delay
    };

    fetchTemplate();
  }, [id]);

  const handleDuplicateTemplate = () => {
    // In a real app, this would call an API to duplicate the template
    // For now, we'll just navigate to the templates page with a success message
    router.push("/prescriptions/templates?duplicated=true");
  };

  const handleDeleteTemplate = () => {
    // In a real app, this would call an API to delete the template
    // For now, we'll just navigate to the templates page with a success message
    router.push("/prescriptions/templates?deleted=true");
  };

  const handleUseTemplate = () => {
    // In a real app, this would apply the template to a new prescription
    // For now, we'll just navigate to the create prescription page
    router.push("/prescriptions/create?template=" + id);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/prescriptions/templates">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Template Details</h1>
            <p className="text-muted-foreground">View and manage medication template details.</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button asChild>
            <Link href="/prescriptions/templates">Return to Templates</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/prescriptions/templates">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Template Details</h1>
          <p className="text-muted-foreground">View and manage medication template details.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/50 p-4 rounded-lg">
        <div>
          <h2 className="text-2xl font-bold">{template.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10">
              {template.category}
            </Badge>
            <span className="text-sm text-muted-foreground">Created by {template.createdBy}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/prescriptions/templates/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Template
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicateTemplate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button size="sm" onClick={handleUseTemplate}>
            <Printer className="mr-2 h-4 w-4" />
            Use Template
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the &quot;{template.name}&quot; template. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTemplate} className="bg-red-500 hover:bg-red-600">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
          <CardDescription>Detailed information about this medication template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {template.description && (
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground">{template.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-3">Medications ({template.medications.length})</h3>
            <div className="space-y-4">
              {template.medications.map((medication: any, index: number) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {medication.name} {medication.dosage}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Route</p>
                        <p className="text-sm">{medication.route}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Frequency</p>
                        <p className="text-sm">{medication.frequency}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm">{medication.duration}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Instructions</p>
                      <p className="text-sm">{medication.instructions}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Usage Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{template.usageCount}</p>
                    <p className="text-sm text-muted-foreground">Total Uses</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{template.lastUsed}</p>
                    <p className="text-sm text-muted-foreground">Last Used</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{template.createdOn}</p>
                    <p className="text-sm text-muted-foreground">Created On</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
