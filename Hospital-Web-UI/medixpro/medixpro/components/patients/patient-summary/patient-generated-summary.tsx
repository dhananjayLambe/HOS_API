import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  headline: string;
  summary: string;
};

export function PatientGeneratedSummary({ headline, summary }: Props) {
  return (
    <Card className="rounded-[28px] border border-slate-200/40 border-l-4 border-l-primary/40 bg-gradient-to-br from-slate-50 via-white to-slate-100/40 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <CardHeader className="p-8 pb-0 lg:p-10 lg:pb-0">
        <CardTitle className="mb-0 max-w-4xl text-[30px] font-semibold leading-tight tracking-tight text-slate-900">{headline}</CardTitle>
      </CardHeader>
      <CardContent className="mt-7 px-8 pb-8 pt-0 lg:px-10 lg:pb-10">
        <p className="max-w-3xl text-[15px] leading-8 text-slate-600">{summary}</p>
      </CardContent>
    </Card>
  );
}
