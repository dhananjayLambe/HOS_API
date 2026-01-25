"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatient } from "@/lib/patientContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Calendar, Phone, FileText, Stethoscope, ClipboardList, AlertCircle, Search } from "lucide-react";
import Link from "next/link";

export default function StartConsultationPage() {
  const { selectedPatient, triggerSearchHighlight } = usePatient();
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!selectedPatient) {
      setShowAlert(true);
    }
  }, [selectedPatient]);

  const handleAlertClose = () => {
    setShowAlert(false);
    router.push("/doctor-dashboard");
  };

  if (!selectedPatient) {
    return (
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle className="text-xl">Select Patient First</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Please select a patient from the search bar at the top to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
            <Search className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <p className="text-sm text-purple-900 dark:text-purple-200">
              Look for the <span className="font-semibold">"Select Patient"</span> search bar in the header
            </p>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction 
              onClick={() => {
                setShowAlert(false);
                triggerSearchHighlight();
                router.push("/doctor-dashboard");
              }}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white order-1"
            >
              Show Search Bar
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleAlertClose}
              className="w-full sm:w-auto order-2"
            >
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/doctor-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Start Consultation</h1>
            <p className="text-muted-foreground">Begin consultation with selected patient</p>
          </div>
        </div>
      </div>

      {/* Patient Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
          <CardDescription>Selected patient details for consultation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-base font-semibold">{selectedPatient.full_name}</p>
            </div>
            {selectedPatient.mobile && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile
                </p>
                <p className="text-base font-semibold">{selectedPatient.mobile}</p>
              </div>
            )}
            {selectedPatient.gender && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Gender</p>
                <p className="text-base font-semibold">{selectedPatient.gender}</p>
              </div>
            )}
            {selectedPatient.date_of_birth && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date of Birth
                </p>
                <p className="text-base font-semibold">
                  {new Date(selectedPatient.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consultation Details Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Examination Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Physical Examination
            </CardTitle>
            <CardDescription>Record physical examination findings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Physical examination section will be available here. You can record examination findings, observations, and clinical notes.
              </p>
              <Button variant="outline" className="w-full">
                Start Examination
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Diagnosis Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Diagnosis
            </CardTitle>
            <CardDescription>Record diagnosis and assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Diagnosis section will be available here. You can add primary and secondary diagnoses, ICD codes, and assessment notes.
              </p>
              <Button variant="outline" className="w-full">
                Add Diagnosis
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Treatment Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Treatment Plan
            </CardTitle>
            <CardDescription>Record treatment and management plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Treatment plan section will be available here. You can add medications, procedures, follow-up instructions, and advice.
              </p>
              <Button variant="outline" className="w-full">
                Add Treatment Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Clinical Notes
            </CardTitle>
            <CardDescription>Additional clinical notes and observations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clinical notes section will be available here. You can add additional notes, observations, and recommendations.
              </p>
              <Button variant="outline" className="w-full">
                Add Notes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button>
          Save Consultation
        </Button>
      </div>
    </div>
  );
}
