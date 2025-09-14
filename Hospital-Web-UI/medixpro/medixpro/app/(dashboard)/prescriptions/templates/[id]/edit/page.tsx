"use client";

import type React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ArrowLeft, Plus, Save, Trash } from "lucide-react";
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

// Sample categories
const categories = ["Cardiovascular", "Endocrine", "Respiratory", "Infectious Disease", "Pain Management", "Allergy", "Gastrointestinal", "Neurology", "Psychiatry"];

// Sample routes
const routes = ["Oral", "Topical", "Subcutaneous", "Intramuscular", "Intravenous", "Inhaled", "Rectal", "Ophthalmic"];

// Sample frequencies
const frequencies = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "Every 4 hours", "Every 6 hours", "Every 8 hours", "Every 12 hours", "As needed", "Before meals", "After meals", "At bedtime"];

// Sample durations
const durations = ["7 days", "10 days", "14 days", "30 days", "60 days", "90 days", "6 months", "Indefinite"];

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const { id } = use(params);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category: "",
    description: "",
    medications: [
      {
        name: "",
        dosage: "",
        route: "Oral",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ],
  });
  const [formErrors, setFormErrors] = useState({
    name: false,
    category: false,
    medications: [{ name: false, dosage: false, frequency: false }],
  });

  useEffect(() => {
    // Simulate API call to fetch template details
    const fetchTemplate = () => {
      setLoading(true);
      setTimeout(() => {
        const foundTemplate = medicationTemplates.find((t) => t.id === id);
        if (foundTemplate) {
          setFormData({
            id: foundTemplate.id,
            name: foundTemplate.name,
            category: foundTemplate.category,
            description: foundTemplate.description || "",
            medications: foundTemplate.medications.map((med) => ({
              name: med.name,
              dosage: med.dosage,
              route: med.route,
              frequency: med.frequency,
              duration: med.duration,
              instructions: med.instructions,
            })),
          });

          // Initialize form errors array to match medications length
          setFormErrors({
            name: false,
            category: false,
            medications: foundTemplate.medications.map(() => ({
              name: false,
              dosage: false,
              frequency: false,
            })),
          });

          setError(null);
        } else {
          setError("Template not found");
        }
        setLoading(false);
      }, 500); // Simulate network delay
    };

    fetchTemplate();
  }, [id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    // Clear error for this field if it exists
    if (field in formErrors) {
      setFormErrors({
        ...formErrors,
        [field]: false,
      });
    }
  };

  const handleMedicationChange = (index: number, field: string, value: string) => {
    const updatedMedications = [...formData.medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value,
    };

    setFormData({
      ...formData,
      medications: updatedMedications,
    });

    // Clear error for this field if it exists
    if (formErrors.medications[index] && field in formErrors.medications[index]) {
      const updatedMedicationErrors = [...formErrors.medications];
      updatedMedicationErrors[index] = {
        ...updatedMedicationErrors[index],
        [field]: false,
      };

      setFormErrors({
        ...formErrors,
        medications: updatedMedicationErrors,
      });
    }
  };

  const handleAddMedication = () => {
    setFormData({
      ...formData,
      medications: [
        ...formData.medications,
        {
          name: "",
          dosage: "",
          route: "Oral",
          frequency: "",
          duration: "",
          instructions: "",
        },
      ],
    });

    // Add a new entry to the errors array
    setFormErrors({
      ...formErrors,
      medications: [...formErrors.medications, { name: false, dosage: false, frequency: false }],
    });
  };

  const handleRemoveMedication = (index: number) => {
    const updatedMedications = [...formData.medications];
    updatedMedications.splice(index, 1);

    setFormData({
      ...formData,
      medications: updatedMedications,
    });

    // Remove the corresponding entry from the errors array
    const updatedMedicationErrors = [...formErrors.medications];
    updatedMedicationErrors.splice(index, 1);

    setFormErrors({
      ...formErrors,
      medications: updatedMedicationErrors,
    });
  };

  const validateForm = () => {
    let isValid = true;
    const newFormErrors = {
      name: false,
      category: false,
      medications: formData.medications.map(() => ({
        name: false,
        dosage: false,
        frequency: false,
      })),
    };

    // Validate basic fields
    if (!formData.name.trim()) {
      newFormErrors.name = true;
      isValid = false;
    }

    if (!formData.category) {
      newFormErrors.category = true;
      isValid = false;
    }

    // Validate medications
    formData.medications.forEach((medication, index) => {
      if (!medication.name.trim()) {
        newFormErrors.medications[index].name = true;
        isValid = false;
      }

      if (!medication.dosage.trim()) {
        newFormErrors.medications[index].dosage = true;
        isValid = false;
      }

      if (!medication.frequency.trim()) {
        newFormErrors.medications[index].frequency = true;
        isValid = false;
      }
    });

    setFormErrors(newFormErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // If there are validation errors, switch to the appropriate tab
      const hasMedicationErrors = formErrors.medications.some((med) => med.name || med.dosage || med.frequency);

      if (hasMedicationErrors) {
        setActiveTab("medications");
      } else {
        setActiveTab("basic");
      }

      return;
    }

    // In a real app, this would call an API to update the template
    console.log("Saving updated template:", formData);

    // Navigate back to the template details page with a success message
    router.push(`/prescriptions/templates/${id}?updated=true`);
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
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
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
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Template</h1>
            <p className="text-muted-foreground">Modify an existing medication template.</p>
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
          <Link href={`/prescriptions/templates/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Template</h1>
          <p className="text-muted-foreground">Modify an existing medication template.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex justify-end mb-4">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name" className={formErrors.name ? "text-red-500" : ""}>
                    Template Name*
                  </Label>
                  <Input id="template-name" placeholder="Enter template name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} className={formErrors.name ? "border-red-500" : ""} />
                  {formErrors.name && <p className="text-sm text-red-500">Template name is required</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-category" className={formErrors.category ? "text-red-500" : ""}>
                    Category*
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger id="template-category" className={formErrors.category ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.category && <p className="text-sm text-red-500">Category is required</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">
                    Description <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea id="template-description" placeholder="Enter template description" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} rows={4} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Medications</CardTitle>
                <Button type="button" onClick={handleAddMedication} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Medication
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.medications.map((medication, index) => (
                  <Card key={index} className="border border-muted">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Medication #{index + 1}</CardTitle>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveMedication(index)} disabled={formData.medications.length === 1}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`med-name-${index}`} className={formErrors.medications[index]?.name ? "text-red-500" : ""}>
                            Medication Name*
                          </Label>
                          <Input id={`med-name-${index}`} placeholder="Medication name" value={medication.name} onChange={(e) => handleMedicationChange(index, "name", e.target.value)} className={formErrors.medications[index]?.name ? "border-red-500" : ""} />
                          {formErrors.medications[index]?.name && <p className="text-sm text-red-500">Medication name is required</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`med-dosage-${index}`} className={formErrors.medications[index]?.dosage ? "text-red-500" : ""}>
                            Dosage*
                          </Label>
                          <Input id={`med-dosage-${index}`} placeholder="e.g., 10mg, 500mg, 5ml" value={medication.dosage} onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)} className={formErrors.medications[index]?.dosage ? "border-red-500" : ""} />
                          {formErrors.medications[index]?.dosage && <p className="text-sm text-red-500">Dosage is required</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`med-route-${index}`}>Route</Label>
                          <Select value={medication.route} onValueChange={(value) => handleMedicationChange(index, "route", value)}>
                            <SelectTrigger id={`med-route-${index}`}>
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
                        <div className="space-y-2">
                          <Label htmlFor={`med-frequency-${index}`} className={formErrors.medications[index]?.frequency ? "text-red-500" : ""}>
                            Frequency*
                          </Label>
                          <Select value={medication.frequency} onValueChange={(value) => handleMedicationChange(index, "frequency", value)}>
                            <SelectTrigger id={`med-frequency-${index}`} className={formErrors.medications[index]?.frequency ? "border-red-500" : ""}>
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
                          {formErrors.medications[index]?.frequency && <p className="text-sm text-red-500">Frequency is required</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`med-duration-${index}`}>Duration</Label>
                          <Select value={medication.duration} onValueChange={(value) => handleMedicationChange(index, "duration", value)}>
                            <SelectTrigger id={`med-duration-${index}`}>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                              {durations.map((duration) => (
                                <SelectItem key={duration} value={duration}>
                                  {duration}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`med-instructions-${index}`}>
                            Instructions <span className="text-muted-foreground">(optional)</span>
                          </Label>
                          <Input id={`med-instructions-${index}`} placeholder="Special instructions" value={medication.instructions} onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <div className="flex gap-2">
            <Button variant="outline" type="button" asChild>
              <Link href={`/prescriptions/templates/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
