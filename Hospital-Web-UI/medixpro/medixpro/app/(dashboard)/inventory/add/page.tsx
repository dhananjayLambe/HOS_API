import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function AddInventoryItemPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/inventory">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Add Inventory Item</h2>
            <p className="text-muted-foreground">Add a new item to your inventory</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Item Details</TabsTrigger>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details of the inventory item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Item Name</Label>
                  <Input id="item-name" placeholder="Enter item name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-id">Item ID/SKU</Label>
                  <Input id="item-id" placeholder="Enter item ID or SKU" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medications">Medications</SelectItem>
                      <SelectItem value="supplies">Medical Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="office">Office Supplies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select>
                    <SelectTrigger id="subcategory">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disposable">Disposable</SelectItem>
                      <SelectItem value="reusable">Reusable</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="otc">Over-the-Counter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Enter item description" rows={4} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit of Measure</Label>
                  <Select>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="each">Each</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="bottle">Bottle</SelectItem>
                      <SelectItem value="case">Case</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-quantity">Unit Quantity</Label>
                  <Input id="unit-quantity" type="number" placeholder="Quantity per unit" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Input id="location" placeholder="Enter storage location" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Enter additional details about the item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input id="manufacturer" placeholder="Enter manufacturer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" placeholder="Enter brand name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model/Version</Label>
                  <Input id="model" placeholder="Enter model or version" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry-tracking">Expiry Tracking</Label>
                  <Select>
                    <SelectTrigger id="expiry-tracking">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Item Properties</Label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="refrigeration" />
                    <Label htmlFor="refrigeration" className="font-normal">
                      Requires Refrigeration
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="controlled" />
                    <Label htmlFor="controlled" className="font-normal">
                      Controlled Substance
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="hazardous" />
                    <Label htmlFor="hazardous" className="font-normal">
                      Hazardous Material
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sterile" />
                    <Label htmlFor="sterile" className="font-normal">
                      Sterile
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Enter any additional notes" rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
              <CardDescription>Configure stock levels and reorder settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="current-stock">Current Stock</Label>
                  <Input id="current-stock" type="number" placeholder="Enter current quantity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-stock">Minimum Stock Level</Label>
                  <Input id="min-stock" type="number" placeholder="Enter minimum quantity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-stock">Maximum Stock Level</Label>
                  <Input id="max-stock" type="number" placeholder="Enter maximum quantity" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reorder-point">Reorder Point</Label>
                  <Input id="reorder-point" type="number" placeholder="Enter reorder point" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorder-quantity">Reorder Quantity</Label>
                  <Input id="reorder-quantity" type="number" placeholder="Enter reorder quantity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-cost">Unit Cost ($)</Label>
                  <Input id="unit-cost" type="number" step="0.01" placeholder="Enter unit cost" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-price">Unit Price ($)</Label>
                  <Input id="unit-price" type="number" step="0.01" placeholder="Enter unit price" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Stock Alerts</Label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="low-stock-alert" defaultChecked />
                    <Label htmlFor="low-stock-alert" className="font-normal">
                      Enable Low Stock Alerts
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="expiry-alert" />
                    <Label htmlFor="expiry-alert" className="font-normal">
                      Enable Expiry Alerts
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Information</CardTitle>
              <CardDescription>Link suppliers to this inventory item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-supplier">Primary Supplier</Label>
                <Select>
                  <SelectTrigger id="primary-supplier">
                    <SelectValue placeholder="Select primary supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medplus">MedPlus Supplies</SelectItem>
                    <SelectItem value="pharmatech">PharmaTech Inc.</SelectItem>
                    <SelectItem value="medequip">MedEquip Solutions</SelectItem>
                    <SelectItem value="healthsupply">Health Supply Co.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supplier-item-code">Supplier Item Code</Label>
                  <Input id="supplier-item-code" placeholder="Enter supplier's item code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-price">Supplier Price ($)</Label>
                  <Input id="supplier-price" type="number" step="0.01" placeholder="Enter supplier price" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-time">Lead Time (Days)</Label>
                  <Input id="lead-time" type="number" placeholder="Enter lead time in days" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-order">Minimum Order Quantity</Label>
                  <Input id="min-order" type="number" placeholder="Enter minimum order quantity" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alternative Suppliers</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="alt-supplier-1" />
                    <Label htmlFor="alt-supplier-1" className="font-normal">
                      PharmaTech Inc.
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="alt-supplier-2" />
                    <Label htmlFor="alt-supplier-2" className="font-normal">
                      MedEquip Solutions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="alt-supplier-3" />
                    <Label htmlFor="alt-supplier-3" className="font-normal">
                      Health Supply Co.
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Link href="/inventory">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Item
        </Button>
      </div>
    </div>
  );
}
