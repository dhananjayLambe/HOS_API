/**
 * EXAMPLE USAGE - This file demonstrates how to use the selected patient
 * in your components. You can reference this when building your own components.
 * 
 * This file is for reference only and can be deleted.
 */

"use client";

import { useState, useEffect } from "react";
import { useSelectedPatient } from "@/hooks/use-selected-patient";
import { SelectedPatientDisplay } from "./selected-patient-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Example 1: Simple component that displays patient info
export function ExamplePatientInfo() {
  const { hasPatient, patientName, patientAge, patientMobile } = useSelectedPatient();

  if (!hasPatient) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No patient selected. Please select a patient from the search bar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <CardContent>
        <p><strong>Name:</strong> {patientName}</p>
        {patientAge && <p><strong>Age:</strong> {patientAge}</p>}
        {patientMobile && <p><strong>Mobile:</strong> {patientMobile}</p>}
      </CardContent>
    </Card>
  );
}

// Example 2: Component that requires a patient for an operation
export function ExampleCreateRecord() {
  const { hasPatient, patientId, requirePatient, patientName } = useSelectedPatient();

  const handleCreate = async () => {
    try {
      // This will throw if no patient is selected
      const patient = requirePatient();
      
      // Simulate API call
      await fetch(`/api/patients/${patient.id}/records`, {
        method: "POST",
        body: JSON.stringify({ /* record data */ }),
      });
      
      toast.success(`Record created for ${patientName}`);
    } catch (error: any) {
      toast.error(error.message || "Please select a patient first");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Record</CardTitle>
      </CardHeader>
      <CardContent>
        {hasPatient ? (
          <div>
            <p className="mb-4">Creating record for: <strong>{patientName}</strong></p>
            <Button onClick={handleCreate}>Create Record</Button>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Please select a patient first to create a record.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Example 3: Component using the display component
export function ExampleWithDisplay() {
  const { hasPatient } = useSelectedPatient();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Page</h2>
      
      {/* Show selected patient at the top */}
      {hasPatient && (
        <div>
          <h3 className="text-sm font-medium mb-2">Selected Patient:</h3>
          <SelectedPatientDisplay variant="card" />
        </div>
      )}
      
      {/* Rest of your page content */}
      <Card>
        <CardContent className="pt-6">
          <p>Your page content here...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Example 4: Component that uses patient ID in API calls
export function ExamplePatientRecords() {
  const { patientId, hasPatient, patientName } = useSelectedPatient();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasPatient || !patientId) {
      setRecords([]);
      return;
    }

    setLoading(true);
    fetch(`/api/patients/${patientId}/records`)
      .then(res => res.json())
      .then(data => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [patientId, hasPatient]);

  if (!hasPatient) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Select a patient to view their records
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Records for {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading records...</p>
        ) : (
          <div>
            {records.length > 0 ? (
              <ul>
                {records.map((record: any) => (
                  <li key={record.id}>{record.title}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No records found</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

