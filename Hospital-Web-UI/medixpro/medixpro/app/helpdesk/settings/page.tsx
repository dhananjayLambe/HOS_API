import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HelpdeskSettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-2">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">Account and clinic preferences</p>
      <Button type="button" variant="secondary" asChild className="w-full sm:w-auto">
        <Link href="/profile">Profile settings</Link>
      </Button>
    </div>
  );
}
