import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, ExternalLink, Mail, MapPin, Package, Phone, Star, User } from "lucide-react"
import Link from "next/link"
import { use } from "react"

export default function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  // Find the supplier by ID
  const supplier = featuredSuppliers.find((s) => s.id === id) || {
    id: id,
    name: "Unknown Supplier",
    description: "Supplier details not found",
    contactPerson: "Unknown",
    phone: "N/A",
    email: "N/A",
    location: "N/A",
    rating: 0,
    status: "Inactive",
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/inventory/suppliers">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{supplier.name}</h2>
            <p className="text-muted-foreground">Supplier ID: {supplier.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/inventory/suppliers/${id}/edit`}>
            <Button variant="outline">Edit Supplier</Button>
          </Link>
          <Button>
            <Package className="mr-2 h-4 w-4" />
            Place Order
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
            <CardDescription>Detailed information about this supplier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">About</h3>
              <p className="text-muted-foreground">{supplier.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Contact Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Contact Person:</span>
                    <span>{supplier.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Phone:</span>
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Email:</span>
                    <span>{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{supplier.location}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Supplier Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge
                      className={
                        supplier.status === "Active"
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-500 hover:bg-gray-600"
                      }
                    >
                      {supplier.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Rating:</span>
                    <div className="flex items-center">
                      {Array(5)
                        .fill(null)
                        .map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < supplier.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                            }`}
                          />
                        ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Category:</span>
                    <span>Medical Supplies</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Visit Website
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Recent orders with this supplier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Total Orders</div>
                <div className="text-2xl font-bold">24</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Active Orders</div>
                <div className="text-2xl font-bold">3</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Last Order</div>
                <div className="text-2xl font-bold">Apr 18</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">Total Spent</div>
                <div className="text-2xl font-bold">$12,450</div>
              </div>
            </div>

            <h3 className="font-semibold mt-4">Recent Orders</h3>
            <div className="space-y-3">
              {recentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                    <Badge
                      variant="outline"
                      className={
                        order.status === "Delivered"
                          ? "border-green-500 text-green-500"
                          : order.status === "Shipped"
                            ? "border-blue-500 text-blue-500"
                            : "border-amber-500 text-amber-500"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${order.amount}</p>
                    <p className="text-xs text-muted-foreground">{order.items} items</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-2">
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="w-full mt-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap">
              <div>
                <CardTitle>Supplied Products</CardTitle>
                <CardDescription>Products available from this supplier</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Min Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">PRD001</TableCell>
                    <TableCell>Surgical Gloves (Box of 100)</TableCell>
                    <TableCell>Disposables</TableCell>
                    <TableCell>$12.50</TableCell>
                    <TableCell>3-5 days</TableCell>
                    <TableCell>10 boxes</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PRD002</TableCell>
                    <TableCell>Disposable Face Masks (Box of 50)</TableCell>
                    <TableCell>Disposables</TableCell>
                    <TableCell>$8.99</TableCell>
                    <TableCell>2-4 days</TableCell>
                    <TableCell>5 boxes</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PRD003</TableCell>
                    <TableCell>Digital Thermometer</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>$24.95</TableCell>
                    <TableCell>5-7 days</TableCell>
                    <TableCell>3 units</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PRD004</TableCell>
                    <TableCell>Blood Pressure Monitor</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>$89.99</TableCell>
                    <TableCell>7-10 days</TableCell>
                    <TableCell>2 units</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PRD005</TableCell>
                    <TableCell>Stethoscope</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>$45.00</TableCell>
                    <TableCell>3-5 days</TableCell>
                    <TableCell>1 unit</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap">
              <div>
                <CardTitle>Order History</CardTitle>
                <CardDescription>Complete history of orders with this supplier</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>{order.items}</TableCell>
                      <TableCell>${order.amount}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            order.status === "Delivered"
                              ? "border-green-500 text-green-500"
                              : order.status === "Shipped"
                                ? "border-blue-500 text-blue-500"
                                : "border-amber-500 text-amber-500"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.status === "Delivered"
                          ? "Apr 22, 2023"
                          : order.status === "Shipped"
                            ? "Apr 19, 2023"
                            : "Apr 19, 2023 (Est.)"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Contracts, agreements, and other documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md border p-2 md:p-4 gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-md bg-muted p-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Supply Agreement</p>
                      <p className="text-sm text-muted-foreground">PDF • 2.4 MB • Updated 3 months ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2 md:p-4 gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-md bg-muted p-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Price List 2023</p>
                      <p className="text-sm text-muted-foreground">XLSX • 1.8 MB • Updated 1 month ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2 md:p-4 gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-md bg-muted p-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Quality Certification</p>
                      <p className="text-sm text-muted-foreground">PDF • 3.1 MB • Updated 6 months ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Internal notes about this supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border p-2 md:p-4 flex justify-between flex-wrap gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-medium">Negotiated Discount</p>
                    <p className="text-sm text-muted-foreground">Added by John Doe • Apr 10, 2023</p>
                  </div>
                  <p className="mt-2 text-sm">
                    We've negotiated a 10% discount on all orders over $1,000. This is valid until the end of the year.
                  </p>
                </div>
                <div className="rounded-md border p-2 md:p-4 flex justify-between flex-wrap gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-medium">Quality Issues</p>
                    <p className="text-sm text-muted-foreground">Added by Jane Smith • Mar 15, 2023</p>
                  </div>
                  <p className="mt-2 text-sm">
                    There were some quality issues with the last batch of surgical gloves. The supplier has been
                    notified and promised to improve quality control.
                  </p>
                </div>
                <div className="rounded-md border p-2 md:p-4 flex justify-between flex-wrap gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-medium">New Contact Person</p>
                    <p className="text-sm text-muted-foreground">Added by Mike Johnson • Feb 28, 2023</p>
                  </div>
                  <p className="mt-2 text-sm">
                    Sarah Johnson is our new contact person at this supplier. She seems very responsive and helpful.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sample data
const featuredSuppliers = [
  {
    id: "SUP001",
    name: "MedPlus Supplies",
    description: "Leading provider of high-quality medical supplies and equipment for healthcare facilities.",
    contactPerson: "Sarah Johnson",
    phone: "(555) 123-4567",
    email: "contact@medplus.com",
    location: "Chicago, IL",
    rating: 5,
    status: "Active",
  },
  {
    id: "SUP002",
    name: "PharmaTech Inc.",
    description: "Specialized pharmaceutical supplier with a wide range of medications and healthcare products.",
    contactPerson: "Michael Chen",
    phone: "(555) 987-6543",
    email: "sales@pharmatech.com",
    location: "Boston, MA",
    rating: 4,
    status: "Active",
  },
  {
    id: "SUP003",
    name: "MedEquip Solutions",
    description: "Premium medical equipment provider specializing in diagnostic and treatment devices.",
    contactPerson: "David Rodriguez",
    phone: "(555) 456-7890",
    email: "info@medequip.com",
    location: "San Diego, CA",
    rating: 4,
    status: "Active",
  },
  {
    id: "SUP006",
    name: "Global Pharma Ltd.",
    description: "International pharmaceutical supplier with extensive inventory of medications and treatments.",
    contactPerson: "Emma Wilson",
    phone: "(555) 789-0123",
    email: "sales@globalpharma.com",
    location: "New York, NY",
    rating: 5,
    status: "Active",
  },
]

const recentOrders = [
  {
    id: "ORD4872",
    supplier: "MedPlus Supplies",
    date: "Apr 18, 2023",
    amount: "1,245.00",
    items: 12,
    status: "Delivered",
  },
  {
    id: "ORD4865",
    supplier: "PharmaTech Inc.",
    date: "Apr 15, 2023",
    amount: "876.50",
    items: 8,
    status: "Shipped",
  },
  {
    id: "ORD4861",
    supplier: "MedEquip Solutions",
    date: "Apr 12, 2023",
    amount: "2,340.75",
    items: 5,
    status: "Processing",
  },
  {
    id: "ORD4858",
    supplier: "Health Supply Co.",
    date: "Apr 10, 2023",
    amount: "567.25",
    items: 15,
    status: "Delivered",
  },
]
