"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RecentTrendRow = {
  metricKey: string;
  label: string;
  today: number;
  week: number;
};

type DoctorRecentTrendsProps = {
  trends: RecentTrendRow[];
  loading?: boolean;
};

export function DoctorRecentTrends({ trends, loading }: DoctorRecentTrendsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trends</CardTitle>
        <CardDescription>Today compared with the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Today</TableHead>
                <TableHead className="text-right">Week</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trends.map((row) => (
                <TableRow key={row.metricKey}>
                  <TableCell className="text-muted-foreground">{row.label}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{row.today}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{row.week}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
