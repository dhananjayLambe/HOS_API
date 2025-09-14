import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// This would typically come from an API or database
const claim = 
  {
    id: "CLM-001",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
    },
    invoice: "INV-001",
    provider: "Blue Cross Blue Shield",
    policyNumber: "BCBS123456789",
    groupNumber: "GRP987654321",
    submittedDate: "2024-04-15",
    amount: 200.0,
    status: "Approved",
    approvedAmount: 180.0,
    paymentDate: "2024-04-22",
    claimType: "Medical",
    notes: "Claim approved with standard copay deduction",
    services: [
      {
        name: "General Consultation",
        date: "2024-04-15",
        billed: 150.0,
        allowed: 135.0,
        patientResp: 15.0,
      },
      {
        name: "Blood Test - Basic Panel",
        date: "2024-04-15",
        billed: 50.0,
        allowed: 45.0,
        patientResp: 5.0,
      },
    ],
  }


export default function ClaimDetailsPage() {

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/billing/insurance">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claim Details</h1>
          <p className="text-muted-foreground">View detailed information about claim {claim.id}</p>
        </div>
      </div>

      <div className="space-y-4 xl:space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Claim Status</CardTitle>
            <Badge
              variant={claim.status === "Approved" ? "default" : claim.status === "Rejected" ? "destructive" : claim.status === "Draft" ? "secondary" : "outline"}
              className={claim.status === "Approved" ? "bg-green-500" : claim.status === "Rejected" ? "bg-red-500" : claim.status === "Draft" ? "bg-gray-500" : "border-amber-500 text-amber-500"}
            >
              {claim.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Submitted Date</dt>
                <dd className="text-2xl font-bold">{claim.submittedDate || "Not submitted"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Claim Amount</dt>
                <dd className="text-2xl font-bold">${claim.amount.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Approved Amount</dt>
                <dd className="text-2xl font-bold">${claim.approvedAmount.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Payment Date</dt>
                <dd className="text-2xl font-bold">{claim.paymentDate || "Pending"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={claim.patient.image} alt={claim.patient.name} />
                  <AvatarFallback>{claim.patient.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{claim.patient.name}</h3>
                  <p className="text-sm text-muted-foreground">Patient ID: {claim.patient.id}</p>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium">Policy Number</dt>
                  <dd>{claim.policyNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Group Number</dt>
                  <dd>{claim.groupNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Provider</dt>
                  <dd>{claim.provider}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claim Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="font-medium">Claim Type</dt>
                  <dd>{claim.claimType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Invoice Number</dt>
                  <dd>{claim.invoice}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Patient Responsibility</dt>
                  <dd>${(claim.amount - claim.approvedAmount).toFixed(2)}</dd>
                </div>
                <div className="mt-4">
                  <dt className="font-medium mb-2">Notes</dt>
                  <dd className="text-muted-foreground">{claim.notes}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Services & Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Billed Amount</TableHead>
                  <TableHead className="text-right">Allowed Amount</TableHead>
                  <TableHead className="text-right">Patient Responsibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="whitespace-nowrap">
                {claim.services.map((service, index) => (
                  <TableRow key={index}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.date}</TableCell>
                    <TableCell className="text-right">${service.billed.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${service.allowed.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${service.patientResp.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
