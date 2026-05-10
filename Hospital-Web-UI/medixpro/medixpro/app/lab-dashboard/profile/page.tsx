"use client";

import { LabPageHeader } from "@/components/labs/common/LabPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/authContext";
import Link from "next/link";

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
          <CardDescription>Signed in as {role?.toLowerCase() === "labadmin" ? "lab administrator" : role}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {name}
          </p>
          <p>
            <span className="text-muted-foreground">Email / username:</span> {email}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">
            Full clinic profile editing may use shared account screens later. For doctor-specific profile UI, the
            legacy route is separate from the lab console.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/profile/">Open legacy profile page</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
