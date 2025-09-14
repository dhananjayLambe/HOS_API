"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, Copy, Edit, FileText, MoreHorizontal, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Sample medication templates
const medicationTemplates = [
  {
    id: "1",
    name: "Hypertension Standard",
    category: "Cardiovascular",
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
const categories = ["All Categories", "Cardiovascular", "Endocrine", "Respiratory", "Infectious Disease", "Pain Management", "Allergy", "Gastrointestinal", "Neurology", "Psychiatry"];

// Sample routes
const routes = ["Oral", "Topical", "Subcutaneous", "Intramuscular", "Intravenous", "Inhaled", "Rectal", "Ophthalmic"];

export default function MedicineTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(medicationTemplates[0]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    description: "",
    medications: [
      {
        name: "",
        dosage: "",
        route: "Oral",
        frequency: "",
        instructions: "",
      },
    ],
  });

  // Check for URL parameters that indicate success messages
  useEffect(() => {
    if (searchParams.has("duplicated")) {
      setSuccessMessage("Template duplicated successfully");
      setShowSuccess(true);
    } else if (searchParams.has("deleted")) {
      setSuccessMessage("Template deleted successfully");
      setShowSuccess(true);
    } else if (searchParams.has("updated")) {
      setSuccessMessage("Template updated successfully");
      setShowSuccess(true);
    } else if (searchParams.has("created")) {
      setSuccessMessage("Template created successfully");
      setShowSuccess(true);
    }

    if (showSuccess) {
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
  }, [searchParams, showSuccess]);

  const handleAddMedication = () => {
    setNewTemplate({
      ...newTemplate,
      medications: [
        ...newTemplate.medications,
        {
          name: "",
          dosage: "",
          route: "Oral",
          frequency: "",
          instructions: "",
        },
      ],
    });
  };

  const handleRemoveMedication = (index: any) => {
    const updatedMedications = [...newTemplate.medications];
    updatedMedications.splice(index, 1);
    setNewTemplate({
      ...newTemplate,
      medications: updatedMedications,
    });
  };

  const handleMedicationChange = (index: any, field: any, value: any) => {
    const updatedMedications = [...newTemplate.medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value,
    };
    setNewTemplate({
      ...newTemplate,
      medications: updatedMedications,
    });
  };

  const handleTemplateChange = (field: any, value: any) => {
    setNewTemplate({
      ...newTemplate,
      [field]: value,
    });
  };

  const handleSaveTemplate = () => {
    // Here you would normally submit the data to your backend
    console.log("Saving template:", newTemplate);

    // Show success message
    setSuccessMessage("Template saved successfully");
    setShowSuccess(true);
    setIsDialogOpen(false);

    // Reset form
    setNewTemplate({
      name: "",
      category: "",
      description: "",
      medications: [
        {
          name: "",
          dosage: "",
          route: "Oral",
          frequency: "",
          instructions: "",
        },
      ],
    });

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const handleViewTemplate = (template: any) => {
    // Navigate to the template details page
    router.push(`/prescriptions/templates/${template.id}`);
  };

  const handleDeleteTemplate = (templateId: any) => {
    // Here you would normally delete the template from your backend
    console.log("Deleting template:", templateId);

    // Show success message
    setSuccessMessage("Template deleted successfully");
    setShowSuccess(true);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const handleDuplicateTemplate = (template: any) => {
    // Here you would normally duplicate the template in your backend
    console.log("Duplicating template:", template);

    // In a real app, you would create a new template based on the existing one
    // and then redirect to the edit page for the new template

    // For now, we'll just show a success message and redirect to the templates page
    router.push(`/prescriptions/templates/${template.id}/edit?duplicate=true`);
  };

  const filteredTemplates = medicationTemplates.filter((template) => {
    // Filter by category
    if (selectedCategory !== "all" && template.category !== selectedCategory) {
      return false;
    }

    // Filter by search query
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by tab
    if (activeTab === "recent") {
      // Show only templates used in the last 30 days
      const lastUsedDate = new Date(template.lastUsed);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastUsedDate >= thirtyDaysAgo;
    }

    if (activeTab === "my") {
      // Show only templates created by the current user
      return template.createdBy === "Dr. Sarah Johnson";
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {showSuccess && (
        <Alert className="bg-green-500/20 border-green-500/20 text-green-500">
          <Check className="size-5" color="green" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center flex-wrap gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/prescriptions">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Medicine Templates</h1>
          <p className="text-muted-foreground">Manage reusable medication templates for prescriptions.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="recent">Recently Used</TabsTrigger>
            <TabsTrigger value="my">My Templates</TabsTrigger>
          </TabsList>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search templates..." className="pl-8 w-full md:w-[250px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>Create a reusable medication template for prescriptions.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input id="template-name" placeholder="Enter template name" value={newTemplate.name} onChange={(e) => handleTemplateChange("name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-category">Category</Label>
                    <Select value={newTemplate.category} onValueChange={(value) => handleTemplateChange("category", value)}>
                      <SelectTrigger id="template-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.slice(1).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea id="template-description" placeholder="Enter template description" value={newTemplate.description} onChange={(e) => handleTemplateChange("description", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Medications</Label>
                      <Button size="sm" variant="outline" onClick={handleAddMedication}>
                        <Plus className="mr-2 h-3 w-3" />
                        Add Medication
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {newTemplate.medications.map((medication, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">Medication #{index + 1}</CardTitle>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveMedication(index)} disabled={newTemplate.medications.length === 1}>
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`med-name-${index}`} className="text-xs">
                                  Name
                                </Label>
                                <Input id={`med-name-${index}`} placeholder="Medication name" className="h-8" value={medication.name} onChange={(e) => handleMedicationChange(index, "name", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`med-dosage-${index}`} className="text-xs">
                                  Dosage
                                </Label>
                                <Input id={`med-dosage-${index}`} placeholder="Dosage" className="h-8" value={medication.dosage} onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`med-route-${index}`} className="text-xs">
                                  Route
                                </Label>
                                <Select value={medication.route} onValueChange={(value) => handleMedicationChange(index, "route", value)}>
                                  <SelectTrigger id={`med-route-${index}`} className="h-8">
                                    <SelectValue placeholder="Route" />
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
                              <div className="space-y-1">
                                <Label htmlFor={`med-frequency-${index}`} className="text-xs">
                                  Frequency
                                </Label>
                                <Input id={`med-frequency-${index}`} placeholder="Frequency" className="h-8" value={medication.frequency} onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`med-instructions-${index}`} className="text-xs">
                                Instructions
                              </Label>
                              <Input id={`med-instructions-${index}`} placeholder="Instructions" className="h-8" value={medication.instructions} onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTemplate}>Save Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="all">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>All Templates</CardTitle>
                <CardDescription>Browse and manage all medication templates.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead className="hidden md:table-cell">Created By</TableHead>
                    <TableHead className="hidden md:table-cell">Last Used</TableHead>
                    <TableHead className="hidden md:table-cell">Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        No templates found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10">
                            {template.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{template.medications.length}</TableCell>
                        <TableCell className="hidden md:table-cell">{template.createdBy}</TableCell>
                        <TableCell className="hidden md:table-cell">{template.lastUsed}</TableCell>
                        <TableCell className="hidden md:table-cell">{template.usageCount} times</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewTemplate(template)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/prescriptions/templates/${template.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Template
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTemplate(template.id)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recently Used Templates</CardTitle>
              <CardDescription>Templates that have been used in the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-8 text-muted-foreground">No recently used templates found</div>
                ) : (
                  filteredTemplates
                    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
                    .slice(0, 6)
                    .map((template) => (
                      <Card key={template.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <CardDescription>{template.category}</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-primary/10">
                              {template.medications.length} meds
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="space-y-1 text-sm">
                            {template.medications.map((med, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <p>
                                  {med.name} {med.dosage}
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-muted-foreground">
                            Last used: {template.lastUsed} • {template.usageCount} times
                          </div>
                        </CardContent>
                        <div className="flex border-t divide-x">
                          <Button variant="ghost" className="flex-1 rounded-none h-10" onClick={() => handleViewTemplate(template)}>
                            <FileText className="mr-2 h-4 w-4" />
                            View
                          </Button>
                          <Button variant="ghost" className="flex-1 rounded-none h-10" asChild>
                            <Link href={`/prescriptions/templates/${template.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            className="flex-1 rounded-none h-10"
                            onClick={() => {
                              // Here you would redirect to create prescription with this template
                              router.push(`/prescriptions/create?template=${template.id}`);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Use
                          </Button>
                        </div>
                      </Card>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my">
          <Card>
            <CardHeader>
              <CardTitle>My Templates</CardTitle>
              <CardDescription>Templates created by you.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead className="hidden md:table-cell">Created On</TableHead>
                    <TableHead className="hidden md:table-cell">Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        You haven't created any templates yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10">
                            {template.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{template.medications.length}</TableCell>
                        <TableCell className="hidden md:table-cell">{template.createdOn}</TableCell>
                        <TableCell className="hidden md:table-cell">{template.lastUsed}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-8" asChild>
                              <Link href={`/prescriptions/templates/${template.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8" onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-red-500" onClick={() => handleDeleteTemplate(template.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>View detailed information about a selected template.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.category} • Created by {selectedTemplate.createdBy}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/prescriptions/templates/${selectedTemplate.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Here you would redirect to create prescription with this template
                      router.push(`/prescriptions/create?template=${selectedTemplate.id}`);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Use Template
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Medications</h4>
                <div className="space-y-3">
                  {selectedTemplate.medications.map((medication, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {medication.name} {medication.dosage}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
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

              <div className="space-y-2">
                <h4 className="font-medium">Usage Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-md">
                    <p className="text-2xl font-bold">{selectedTemplate.usageCount}</p>
                    <p className="text-sm text-muted-foreground">Total Uses</p>
                  </div>
                  <div className="p-4 border rounded-md">
                    <p className="text-2xl font-bold">{selectedTemplate.lastUsed}</p>
                    <p className="text-sm text-muted-foreground">Last Used</p>
                  </div>
                  <div className="p-4 border rounded-md">
                    <p className="text-2xl font-bold">{selectedTemplate.createdOn}</p>
                    <p className="text-sm text-muted-foreground">Created On</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
