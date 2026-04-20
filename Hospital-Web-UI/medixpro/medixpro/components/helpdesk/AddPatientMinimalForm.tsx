"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface AddPatientMinimalFormProps {
  onSubmit: (name: string, mobile: string) => void;
  submitLabel?: string;
}

export function AddPatientMinimalForm({ onSubmit, submitLabel = "Save & Add to Queue" }: AddPatientMinimalFormProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const m = mobile.trim().replace(/\D/g, "");
    if (!n) {
      setError("Name is required");
      return;
    }
    if (!m || m.length < 10) {
      setError("Valid mobile is required");
      return;
    }
    setError(null);
    onSubmit(n, mobile.trim());
    setName("");
    setMobile("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="hp-name">Name *</Label>
        <Input
          id="hp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoComplete="name"
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hp-mobile">Mobile *</Label>
        <Input
          id="hp-mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="10-digit mobile"
          inputMode="tel"
          autoComplete="tel"
          className="h-11"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
