"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";

interface EditTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: {
    id: number;
    name: string;
    checkIn: string | null;
    checkOut: string | null;
  };
  onSave: (data: { timeType: string; time: string }) => void;
}

export function EditTimeModal({ isOpen, onClose, staffMember, onSave }: EditTimeModalProps) {
  const [timeType, setTimeType] = useState<string>(staffMember.checkIn ? "check-out" : "check-in");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>(timeType === "check-in" ? staffMember.checkIn?.slice(0, 5) || "" : staffMember.checkOut?.slice(0, 5) || "");

  const handleSave = () => {
    onSave({ timeType, time });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Attendance Time</DialogTitle>
          <DialogDescription>Update check-in or check-out time for {staffMember.name}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="time-type">Record Type</Label>
            <Select value={timeType} onValueChange={setTimeType}>
              <SelectTrigger id="time-type">
                <SelectValue placeholder="Select record type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check-in">Check In</SelectItem>
                <SelectItem value="check-out">Check Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time"  value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                  <span>{date ? date.toDateString() : "Pick a date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for Edit</Label>
            <Input id="reason" placeholder="Reason for editing the time record" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
