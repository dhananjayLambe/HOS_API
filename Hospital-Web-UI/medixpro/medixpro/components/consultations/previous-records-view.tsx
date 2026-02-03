"use client";

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface PreviousRecord {
  encounter_id: string;
  consultation_pnr: string;
  created_at: string;
  completed_at: string | null;
  sections: Record<string, any>;
}

interface PreviousRecordsViewProps {
  records: PreviousRecord[];
}

export const PreviousRecordsView = memo<PreviousRecordsViewProps>(
  ({ records }) => {
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

    if (records.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Previous Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {records.map((record) => {
              const isExpanded = expandedRecord === record.encounter_id;
              const recordDate = new Date(record.created_at);

              return (
                <Card key={record.encounter_id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(recordDate, "MMM dd, yyyy HH:mm")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({record.consultation_pnr})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedRecord(
                            isExpanded ? null : record.encounter_id
                          )
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {Object.entries(record.sections).map(
                          ([sectionCode, sectionData]) => (
                            <div key={sectionCode} className="border-l-2 pl-4">
                              <h4 className="font-semibold mb-2 capitalize">
                                {sectionCode.replace(/_/g, " ")}
                              </h4>
                              <div className="text-sm text-muted-foreground space-y-1">
                                {typeof sectionData === "object" &&
                                sectionData !== null ? (
                                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                    {JSON.stringify(sectionData, null, 2)}
                                  </pre>
                                ) : (
                                  <p>{String(sectionData)}</p>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }
);

PreviousRecordsView.displayName = "PreviousRecordsView";
