"use client";

import type React from "react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

// Sample specialization data (in a real app, this would come from an API)
const specializations = [
  {
    id: "1",
    name: "Cardiology",
    description: "Diagnosis and treatment of heart disorders",
    doctorsCount: 5,
    departmentId: "1",
    department: "Internal Medicine",
    status: "Active",
  },
  {
    id: "2",
    name: "Neurology",
    description: "Diagnosis and treatment of disorders of the nervous system",
    doctorsCount: 3,
    departmentId: "2",
    department: "Neuroscience",
    status: "Active",
  },
  {
    id: "3",
    name: "Pediatrics",
    description: "Medical care of infants, children, and adolescents",
    doctorsCount: 7,
    departmentId: "3",
    department: "Child Health",
    status: "Active",
  },
];

// Sample departments data
const departments = [
  { id: "1", name: "Internal Medicine" },
  { id: "2", name: "Neuroscience" },
  { id: "3", name: "Child Health" },
  { id: "4", name: "Surgery" },
  { id: "5", name: "Skin Health" },
  { id: "6", name: "Mental Health" },
  { id: "7", name: "Eye Care" },
  { id: "8", name: "Women's Health" },
];

export default function EditSpecializationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = use(params);
  // Find the specialization by ID
  const specialization = specializations.find((s) => s.id === id) || {
    id: "",
    name: "",
    description: "",
    doctorsCount: 0,
    departmentId: "",
    department: "",
    status: "Active",
  };

  const [formData, setFormData] = useState({
    name: specialization.name,
    description: specialization.description,
    departmentId: specialization.departmentId,
    status: specialization.status,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Specialization name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.departmentId) {
      newErrors.departmentId = "Department is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Specialization updated",
        description: `${formData.name} has been updated successfully.`,
      });
      router.push("/doctors/specializations");
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/doctors">Doctors</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/doctors/specializations">Specializations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Edit</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/doctors/specializations">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Specialization</h1>
            <p className="text-muted-foreground">Update specialization details and information.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Specialization Information</CardTitle>
          <CardDescription>Update the details of this medical specialization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Specialization Name <span className="text-red-500">*</span>
                </Label>
                <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Enter specialization name" className={errors.name ? "border-red-500" : ""} />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea id="description" value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Enter description" className={errors.description ? "border-red-500" : ""} rows={4} />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.departmentId} onValueChange={(value) => handleChange("departmentId", value)}>
                  <SelectTrigger className={errors.departmentId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departmentId && <p className="text-sm text-red-500">{errors.departmentId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" asChild>
                <Link href="/doctors/specializations">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
