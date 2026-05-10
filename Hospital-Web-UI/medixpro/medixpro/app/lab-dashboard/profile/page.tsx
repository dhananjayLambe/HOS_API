"use client";

import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/authContext";
import { isLabAdminRole } from "@/lib/jwtUtils";

export default function LabProfilePage() {
  const { user, role } = useAuth();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || "—";
  const email = user?.email || user?.username || "—";

  return (
    <div className="space-y-6">
      <LabPageHeader title="Profile" description="Account summary — lab workspace." />
      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>
            Signed in as {isLabAdminRole(role) ? "lab administrator" : role ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {name}
          </p>
          <p>
            <span className="text-muted-foreground">Email / username:</span> {email}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">
            Lab account details and editing flows live here in the lab console only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
