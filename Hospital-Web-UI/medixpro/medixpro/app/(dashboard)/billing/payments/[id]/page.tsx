import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle, Clock, CreditCard, Download, FileText, Mail, Printer, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";

// Sample payments data
const payments = [
  {
    id: "PMT-001",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      address: "123 Main St, Anytown, CA 94321",
    },
    invoice: {
      id: "INV-001",
      date: "2024-04-15",
      dueDate: "2024-04-30",
      amount: 200.0,
      description: "Medical consultation and lab tests",
      items: [
        { name: "General Consultation", price: 150.0, quantity: 1 },
        { name: "Blood Test", price: 50.0, quantity: 1 },
      ],
    },
    date: "2024-04-22",
    amount: 200.0,
    method: "Credit Card",
    status: "Completed",
    cardType: "Visa",
    cardLast4: "4242",
    transactionId: "txn_1234567890",
    receiptNumber: "RCP-001-2024",
    notes: "Payment processed successfully",
    processedBy: "Sarah Johnson",
  },
  {
    id: "PMT-002",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
      id: "P34567",
      email: "robert.wilson@example.com",
      phone: "+1 (555) 234-5678",
      address: "456 Oak Ave, Somewhere, NY 10001",
    },
    invoice: {
      id: "INV-003",
      date: "2024-04-15",
      dueDate: "2024-04-30",
      amount: 175.0,
      description: "Physical therapy session",
      items: [{ name: "Physical Therapy Session", price: 175.0, quantity: 1 }],
    },
    date: "2024-04-20",
    amount: 175.0,
    method: "Debit Card",
    status: "Completed",
    cardType: "Mastercard",
    cardLast4: "5678",
    transactionId: "txn_2345678901",
    receiptNumber: "RCP-002-2024",
    notes: "Payment processed successfully",
    processedBy: "Michael Brown",
  },
  {
    id: "PMT-003",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
      id: "P45678",
      email: "jessica.brown@example.com",
      phone: "+1 (555) 345-6789",
      address: "789 Pine St, Elsewhere, TX 75001",
    },
    invoice: {
      id: "INV-004",
      date: "2024-04-10",
      dueDate: "2024-04-25",
      amount: 520.0,
      description: "Specialist consultation and diagnostic imaging",
      items: [
        { name: "Specialist Consultation", price: 250.0, quantity: 1 },
        { name: "MRI Scan", price: 270.0, quantity: 1 },
      ],
    },
    date: "2024-04-18",
    amount: 520.0,
    method: "Bank Transfer",
    status: "Completed",
    transactionId: "txn_3456789012",
    receiptNumber: "RCP-003-2024",
    notes: "Bank transfer confirmed",
    processedBy: "David Wilson",
  },
  {
    id: "PMT-004",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
      id: "P67890",
      email: "sarah.thompson@example.com",
      phone: "+1 (555) 456-7890",
      address: "101 Maple Dr, Nowhere, FL 33101",
    },
    invoice: {
      id: "INV-006",
      date: "2024-04-05",
      dueDate: "2024-04-20",
      amount: 300.0,
      description: "Dental cleaning and check-up",
      items: [
        { name: "Dental Cleaning", price: 150.0, quantity: 1 },
        { name: "Dental Check-up", price: 150.0, quantity: 1 },
      ],
    },
    date: "2024-04-15",
    amount: 300.0,
    method: "Cash",
    status: "Completed",
    receiptNumber: "RCP-004-2024",
    notes: "Cash payment received",
    processedBy: "Jennifer Davis",
  },
  {
    id: "PMT-005",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      address: "123 Main St, Anytown, CA 94321",
    },
    invoice: {
      id: "INV-001",
      date: "2024-04-15",
      dueDate: "2024-04-30",
      amount: 200.0,
      description: "Medical consultation and lab tests",
      items: [
        { name: "General Consultation", price: 150.0, quantity: 1 },
        { name: "Blood Test", price: 50.0, quantity: 1 },
      ],
    },
    date: "2024-04-10",
    amount: 50.0,
    method: "Insurance",
    status: "Processing",
    claimNumber: "CLM-98765",
    receiptNumber: "RCP-005-2024",
    notes: "Insurance claim submitted, awaiting processing",
    processedBy: "Lisa Johnson",
  },
  {
    id: "PMT-006",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
      id: "P23456",
      email: "emily.davis@example.com",
      phone: "+1 (555) 567-8901",
      address: "234 Elm St, Somewhere Else, WA 98001",
    },
    invoice: {
      id: "INV-002",
      date: "2024-04-20",
      dueDate: "2024-05-05",
      amount: 350.0,
      description: "Pediatric consultation",
      items: [
        { name: "Pediatric Consultation", price: 200.0, quantity: 1 },
        { name: "Vaccination", price: 150.0, quantity: 1 },
      ],
    },
    date: "2024-04-25",
    amount: 350.0,
    method: "Credit Card",
    status: "Failed",
    cardType: "Visa",
    cardLast4: "1234",
    transactionId: "txn_4567890123",
    failureReason: "Insufficient funds",
    notes: "Payment failed due to insufficient funds",
    processedBy: "Robert Taylor",
  },
  {
    id: "PMT-007",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
      id: "P56789",
      email: "michael.johnson@example.com",
      phone: "+1 (555) 678-9012",
      address: "567 Cedar Ln, Elsewhere, IL 60001",
    },
    invoice: {
      id: "INV-005",
      date: "2024-04-25",
      dueDate: "2024-05-10",
      amount: 450.0,
      description: "Orthopedic consultation and X-ray",
      items: [
        { name: "Orthopedic Consultation", price: 250.0, quantity: 1 },
        { name: "X-ray", price: 200.0, quantity: 1 },
      ],
    },
    date: "2024-04-28",
    amount: 450.0,
    method: "Check",
    status: "Pending",
    checkNumber: "CHK-56789",
    receiptNumber: "RCP-007-2024",
    notes: "Check payment pending clearance",
    processedBy: "Amanda Wilson",
  },
];

export default function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const payment = payments.find((p) => p.id === id);

  if (!payment) {
    notFound();
  }

  // Helper function to get status icon
  const getStatusIcon = () => {
    switch (payment.status) {
      case "Completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "Pending":
      case "Processing":
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  // Helper function to get status badge
  const getStatusBadge = () => {
    switch (payment.status) {
      case "Completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "Failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "Pending":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Pending
          </Badge>
        );
      case "Processing":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            Processing
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/billing/payments">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold mb-2">Payment Receipt</h2>
          <p className="text-muted-foreground">
            {payment.id} • {payment.receiptNumber}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Receipt
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link href={`/billing/${payment.invoice.id}`}>
              <FileText className="h-4 w-4" />
              View Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Transaction information</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {getStatusBadge()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between flex-wrap gap-3">
              <span className="text-muted-foreground">Payment ID</span>
              <span className="font-medium">{payment.id}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-3">
              <span className="text-muted-foreground">Receipt Number</span>
              <span className="font-medium">{payment.receiptNumber}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-3">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{payment.date}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-3">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">${payment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-3">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium">{payment.method}</span>
            </div>
            {payment.cardType && (
              <div className="flex justify-between flex-wrap gap-3">
                <span className="text-muted-foreground">Card</span>
                <span className="font-medium">
                  {payment.cardType} ending in {payment.cardLast4}
                </span>
              </div>
            )}
            {payment.transactionId && (
              <div className="flex justify-between flex-wrap gap-3">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-medium">{payment.transactionId}</span>
              </div>
            )}
            {payment.checkNumber && (
              <div className="flex justify-between flex-wrap gap-3">
                <span className="text-muted-foreground">Check Number</span>
                <span className="font-medium">{payment.checkNumber}</span>
              </div>
            )}
            {payment.claimNumber && (
              <div className="flex justify-between flex-wrap gap-3">
                <span className="text-muted-foreground">Claim Number</span>
                <span className="font-medium">{payment.claimNumber}</span>
              </div>
            )}
            <div className="flex justify-between flex-wrap gap-3">
              <span className="text-muted-foreground">Processed By</span>
              <span className="font-medium">{payment.processedBy}</span>
            </div>
            {payment.failureReason && (
              <div className="flex justify-between flex-wrap gap-3">
                <span className="text-muted-foreground">Failure Reason</span>
                <span className="font-medium text-red-500">{payment.failureReason}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>Patient details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={payment.patient.image || "/user-2.png"} alt={payment.patient.name} />
                <AvatarFallback>{payment.patient.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{payment.patient.name}</p>
                <p className="text-xs text-muted-foreground">{payment.patient.id}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="text-muted-foreground min-w-24">Email:</span>
                <span>{payment.patient.email}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-muted-foreground min-w-24">Phone:</span>
                <span>{payment.patient.phone}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-muted-foreground min-w-24">Address:</span>
                <span>{payment.patient.address}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Information about the related invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Invoice Details</TabsTrigger>
              <TabsTrigger value="items">Line Items</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Invoice Number</span>
                <Link href={`/billing/${payment.invoice.id}`} className="font-medium text-primary hover:underline">
                  {payment.invoice.id}
                </Link>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Invoice Date</span>
                <span>{payment.invoice.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Due Date</span>
                <span>{payment.invoice.dueDate}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-3 border-b pb-2">
                <span className="text-muted-foreground">Description</span>
                <span>{payment.invoice.description}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-medium">${payment.invoice.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-medium">${payment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Remaining Balance</span>
                <span>${Math.max(0, payment.invoice.amount - payment.amount).toFixed(2)}</span>
              </div>
            </TabsContent>
            <TabsContent value="items">
              <div className="rounded-md border overflow-x-auto">
                <table className="min-w-full divide-y divide-border whitespace-nowrap">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Item</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Price</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payment.invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">${item.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={3} className="px-4 py-3 text-sm font-medium text-right">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right">${payment.invoice.amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <div className="space-y-2 w-full">
            <h4 className="font-medium">Notes</h4>
            <p className="text-sm text-muted-foreground">{payment.notes || "No notes available."}</p>
          </div>
        </CardFooter>
      </Card>

      {payment.status === "Failed" && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Payment Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              This payment failed due to: <span className="font-medium">{payment.failureReason}</span>
            </p>
          </CardContent>
          <CardFooter>
            <Button className="gap-2">
              <CreditCard className="h-4 w-4" />
              Retry Payment
            </Button>
          </CardFooter>
        </Card>
      )}

      {(payment.status === "Pending" || payment.status === "Processing") && (
        <Card className="border-amber-500/10 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Payment {payment.status}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700">This payment is currently {payment.status.toLowerCase()}. It may take some time to complete.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Check Status
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
