"use client";

import type { PrescriptionSummaryPayload } from "@/components/prescriptions/types";

interface PrescriptionPreviewProps {
  summary: PrescriptionSummaryPayload;
  pnr: string;
  cancelled?: boolean;
}

const valueOrDash = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

export function PrescriptionPreview({ summary, pnr, cancelled = false }: PrescriptionPreviewProps) {
  const diagnoses = summary.diagnoses ?? [];
  const medicines = summary.prescriptions ?? [];
  const advice = summary.instructions ?? [];
  const investigations = summary.investigations ?? [];
  const vitals = summary.vitals ?? {};
  const followUp = summary.follow_up;

  return (
    <div id="rx-print-area" className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
      {cancelled ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="rotate-[-28deg] text-7xl font-bold tracking-[0.35em] text-red-500/15">CANCELLED</span>
        </div>
      ) : null}

      <div className="space-y-6 p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 border-b pb-5 md:flex-row">
          <div>
            <p className="text-2xl font-bold">{valueOrDash(summary.clinic?.name)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{valueOrDash(summary.clinic?.address)}</p>
            <p className="text-sm text-muted-foreground">Ph: {valueOrDash(summary.clinic?.contact)}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-lg font-semibold">{valueOrDash(summary.doctor?.full_name)}</p>
            <p className="text-sm text-muted-foreground">{valueOrDash(summary.doctor?.qualification)}</p>
            <p className="text-sm text-muted-foreground">Reg. No: {valueOrDash(summary.doctor?.registration_number)}</p>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">Patient Details</p>
            <p>
              <span className="text-muted-foreground">Name:</span> {valueOrDash(summary.patient?.full_name)}
            </p>
            <p>
              <span className="text-muted-foreground">Age / Gender:</span> {valueOrDash(summary.patient?.age_display)}/
              {valueOrDash(summary.patient?.gender)}
            </p>
            <p>
              <span className="text-muted-foreground">Mobile:</span> {valueOrDash(summary.patient?.mobile)}
            </p>
            <p>
              <span className="text-muted-foreground">PNR:</span> {valueOrDash(pnr)}
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">Consultation Details</p>
            <p>
              <span className="text-muted-foreground">Visit Date:</span> {valueOrDash(summary.visit?.date_display)}
            </p>
            <p>
              <span className="text-muted-foreground">Visit Time:</span> {valueOrDash(summary.visit?.time_display)}
            </p>
            <p>
              <span className="text-muted-foreground">Visit Type:</span> {valueOrDash(summary.visit?.type)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs md:text-sm">
          {vitals.bp ? <span className="rounded-full bg-slate-100 px-3 py-1">BP: {vitals.bp} mmHg</span> : null}
          {vitals.pulse ? <span className="rounded-full bg-slate-100 px-3 py-1">Pulse: {vitals.pulse} bpm</span> : null}
          {vitals.temperature ? (
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Temp: {vitals.temperature}°{vitals.temperature_unit || "F"}
            </span>
          ) : null}
          {vitals.spo2 ? <span className="rounded-full bg-slate-100 px-3 py-1">SpO2: {vitals.spo2}</span> : null}
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground">Diagnosis</p>
          {diagnoses.length > 0 ? (
            <p className="mt-1 text-sm">
              {diagnoses
                .map((item: any) => valueOrDash(item?.name || item?.label || item?.display_name))
                .join(", ")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No diagnosis recorded.</p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground">Recommended Tests</p>
          {investigations.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {investigations.map((item: any, index) => (
                <li key={`${item?.name || "test"}-${index}`}>
                  {valueOrDash(item?.name || item?.label || item?.display_name)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No tests recommended.</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="px-3 py-2 font-semibold">Medicine</th>
                <th className="px-3 py-2 font-semibold">Dosage</th>
                <th className="px-3 py-2 font-semibold">Timing</th>
                <th className="px-3 py-2 font-semibold">Duration</th>
                <th className="px-3 py-2 font-semibold">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.length > 0 ? (
                medicines.map((item, index) => (
                  <tr key={`${item.drug_name || "med"}-${index}`} className="border-b align-top">
                    <td className="px-3 py-2 font-medium">{valueOrDash(item.drug_name)}</td>
                    <td className="px-3 py-2">{valueOrDash(item.dose_display_numeric || item.dosage_display)}</td>
                    <td className="px-3 py-2">{valueOrDash(item.timing_pattern || item.frequency_display)}</td>
                    <td className="px-3 py-2">{valueOrDash(item.duration_display)}</td>
                    <td className="px-3 py-2">{valueOrDash(item.instructions)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    No medicines prescribed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Advice</p>
            {advice.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {advice.map((item, index) => (
                  <li key={`${item.text || "advice"}-${index}`}>{valueOrDash(item.text)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No advice added.</p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground">Follow Up</p>
            <p className="mt-2 text-sm">{valueOrDash(followUp?.date_display)}</p>
            {followUp?.notes ? <p className="mt-1 text-sm text-muted-foreground">{followUp.notes}</p> : null}
          </div>
        </div>

        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          This is a computer-generated prescription and does not require signature.
        </div>
      </div>
    </div>
  );
}
