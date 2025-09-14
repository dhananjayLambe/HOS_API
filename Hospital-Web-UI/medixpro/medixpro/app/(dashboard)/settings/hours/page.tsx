"use client"
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function WorkingHoursPage() {
  const [specialDate, setSpecialDate] = useState<Date | undefined>(new Date());
  const [holidayDate, setHolidayDate] = useState<Date | undefined>(new Date());
  const [holiday2Date, setHoliday2Date] = useState<Date | undefined>(new Date());
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center space-x-2">
          <Link href="/settings">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Working Hours</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">Cancel</Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clinic Hours</CardTitle>
            <CardDescription>Set your clinic's regular operating hours for each day of the week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => (
                <div key={day} className="flex items-center justify-between flex-wrap gap-3 space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id={`day-${index}`} defaultChecked={index < 6} />
                    <Label htmlFor={`day-${index}`} className="w-24">
                      {day}
                    </Label>
                  </div>
                  <div className="flex flex-1 items-center space-x-2">
                    <Select defaultValue={index < 5 ? "08:00" : "09:00"}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 6).map((hour) => (
                          <SelectItem key={`${hour}:00`} value={`${hour.toString().padStart(2, "0")}:00`}>
                            {`${hour}:00 ${hour < 12 ? "AM" : "PM"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select defaultValue={index < 5 ? "18:00" : "15:00"}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="End time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 10).map((hour) => (
                          <SelectItem key={`${hour}:00`} value={`${hour.toString().padStart(2, "0")}:00`}>
                            {`${hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? "AM" : "PM"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <Switch id="24-hour" />
                <Label htmlFor="24-hour">Use 24-hour format</Label>
              </div>
              <Button variant="outline" size="sm">
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Break Times</CardTitle>
              <CardDescription>Configure daily break times for your clinic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <Label className="w-24">Lunch Break</Label>
                  <div className="flex flex-1 items-center space-x-2">
                    <Select defaultValue="12:00">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 11).map((hour) => (
                          <SelectItem key={`${hour}:00`} value={`${hour.toString().padStart(2, "0")}:00`}>
                            {`${hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? "AM" : "PM"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select defaultValue="13:00">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="End time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 12).map((hour) => (
                          <SelectItem key={`${hour}:00`} value={`${hour.toString().padStart(2, "0")}:00`}>
                            {`${hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? "AM" : "PM"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <Label className="w-24">Coffee Break</Label>
                  <div className="flex flex-1 items-center space-x-2">
                    <Select defaultValue="15:00">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 14).map((hour) => (
                          <SelectItem key={`${hour}:00`} value={`${hour.toString().padStart(2, "0")}:00`}>
                            {`${hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? "AM" : "PM"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select defaultValue="15:30">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="End time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 6 }, (_, i) => `${15}:${(i * 10).toString().padStart(2, "0")}`).map((time) => (
                          <SelectItem key={time} value={time}>
                            {`${Number.parseInt(time.split(":")[0]) > 12 ? Number.parseInt(time.split(":")[0]) - 12 : Number.parseInt(time.split(":")[0])}:${time.split(":")[1]} PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Break Time
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Special Hours & Holidays</CardTitle>
              <CardDescription>Set special operating hours or mark holidays</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="special">
                <TabsList>
                  <TabsTrigger value="special">Special Hours</TabsTrigger>
                  <TabsTrigger value="holidays">Holidays</TabsTrigger>
                </TabsList>
                <TabsContent value="special" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center flex-wrap gap-3">
                      <div className="flex-1">
                        <Label htmlFor="special-date">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                              <span>{specialDate ? specialDate.toDateString() : "Pick a date"}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={specialDate} onSelect={setSpecialDate} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="special-start">Start Time</Label>
                        <Input type="time" id="special-start" defaultValue="10:00" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="special-end">End Time</Label>
                        <Input type="time" id="special-end" defaultValue="16:00" />
                      </div>
                      <Button variant="ghost" size="icon" className="mt-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Special Hours
                  </Button>
                </TabsContent>
                <TabsContent value="holidays" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="holiday-date">Date</Label>                   
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                              <span>{holidayDate ? holidayDate.toDateString() : "Pick a date"}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={holidayDate} onSelect={setHolidayDate} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="holiday-name">Holiday Name</Label>
                        <Input type="text" id="holiday-name" placeholder="e.g. Christmas Day" />
                      </div>
                      <Button variant="ghost" size="icon" className="mt-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="holiday-date-2">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                              <span>{holiday2Date ? holiday2Date.toDateString() : "Pick a date"}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={holiday2Date} onSelect={setHoliday2Date} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="holiday-name-2">Holiday Name</Label>
                        <Input type="text" id="holiday-name-2" placeholder="e.g. New Year's Day" />
                      </div>
                      <Button variant="ghost" size="icon" className="mt-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Holiday
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Slots</CardTitle>
          <CardDescription>Configure default appointment duration and scheduling rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="default-duration">Default Appointment Duration</Label>
              <Select defaultValue="30">
                <SelectTrigger id="default-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buffer-time">Buffer Time Between Appointments</Label>
              <Select defaultValue="5">
                <SelectTrigger id="buffer-time">
                  <SelectValue placeholder="Select buffer time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance-booking">Maximum Advance Booking</Label>
              <Select defaultValue="60">
                <SelectTrigger id="advance-booking">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Scheduling Rules</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch id="allow-same-day" defaultChecked />
                <Label htmlFor="allow-same-day">Allow same-day appointments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="allow-concurrent" />
                <Label htmlFor="allow-concurrent">Allow concurrent appointments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="require-approval" defaultChecked />
                <Label htmlFor="require-approval">Require approval for new patients</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="allow-reschedule" defaultChecked />
                <Label htmlFor="allow-reschedule">Allow patient rescheduling</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
