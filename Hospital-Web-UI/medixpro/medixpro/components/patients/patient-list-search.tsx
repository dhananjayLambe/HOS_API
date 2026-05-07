"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { RefObject } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  inputRef?: RefObject<HTMLInputElement>;
}

export function PatientListSearch({ value, onChange, onEnter, inputRef }: Props) {
  return (
    <div className="w-full md:max-w-[520px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder="Search by Patient Name / Mobile / UHID / PNR"
          className="h-12 border-input/60 pl-9 focus-visible:ring-1 focus-visible:ring-ring/40"
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Search by patient name, mobile number, UHID, or visit PNR
      </p>
    </div>
  );
}
