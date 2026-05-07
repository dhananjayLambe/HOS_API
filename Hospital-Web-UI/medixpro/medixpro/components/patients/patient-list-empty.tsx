import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onResetFilters: () => void;
}

export function PatientListEmpty({ onResetFilters }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No matching patients found</h3>
      <p className="mt-1 text-sm text-muted-foreground">Try searching with:</p>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <p>• Patient name</p>
        <p>• Mobile number</p>
        <p>• UHID</p>
        <p>• Visit PNR</p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" onClick={onResetFilters}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
