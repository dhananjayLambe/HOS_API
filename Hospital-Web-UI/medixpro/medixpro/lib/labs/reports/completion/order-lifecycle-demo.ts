import { recomputeOrderDerived } from "@/lib/labs/reports/completion/next-action-engine";
import type {
  AttentionItem,
  CompletionFilterKey,
  CompletionKpis,
  OrderLifecycleViewModel,
  PatientOrderGroupViewModel,
  ReportArtifactViewModel,
  ReportChipViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  inferArtifactType,
  isFailedReport,
  isPendingUpload,
  isReadyToSend,
  isUpdatedReportPendingSend,
} from "@/lib/labs/reports/completion/operational-contract";

function patientKey(name: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 6) return `phone:${digits}`;
  return `name:${name.trim().toLowerCase()}`;
}

function rid(prefix: string): string {
  return `demo-rpt-${prefix}`;
}

function oid(prefix: string): string {
  return `demo-task-${prefix}`;
}

function art(
  id: string,
  fileName: string,
  mimeType: string,
  uploadedAtLabel = "2h ago",
): ReportArtifactViewModel {
  const artifactType = inferArtifactType(fileName, mimeType);
  const lower = fileName.toLowerCase();
  return {
    id: `demo-art-${id}`,
    fileName,
    mimeType,
    artifactType,
    patientVisible: artifactType === "PRIMARY_REPORT",
    uploadedAtLabel,
    uploadedByName: "Priya",
    versionNumber: 1,
    previewUrl: mimeType.startsWith("image/") ? "/placeholder.svg" : undefined,
    previewText: lower.endsWith(".txt") ? "Sample report notes\nReviewed by diagnostics team\nReady for patient delivery." : undefined,
    previewRows: lower.endsWith(".csv") || lower.endsWith(".xlsx")
      ? [
          ["Test", "Value", "Unit", "Flag"],
          ["Hemoglobin", "13.8", "g/dL", "Normal"],
          ["WBC", "7,800", "cells/uL", "Normal"],
          ["Platelets", "2.4", "lakh/uL", "Normal"],
        ]
      : undefined,
    zipEntries: lower.endsWith(".zip")
      ? ["report.pdf", "machine-export.csv", "graph.png"]
      : undefined,
  };
}

function chip(
  reportId: string,
  testLabel: string,
  status: ReportChipViewModel["status"],
  artifacts: ReportArtifactViewModel[] = [],
  options: Partial<Pick<ReportChipViewModel, "deliveryState" | "pendingReason" | "availableActions">> & {
    isReuploaded?: boolean;
  } = {},
): ReportChipViewModel {
  const deliveryState =
    options.deliveryState ??
    (status === "sent" ? "sent" : status === "failed" || status === "failed_delivery" ? "failed" : "not_sent");
  const versions =
    artifacts.length > 0
      ? [
          {
            versionId: `${reportId}-v1`,
            versionNumber: 1,
            label: options.isReuploaded ? "v1 Updated" : "v1 Latest",
            isLatest: true,
            status,
            deliveryState,
            artifacts,
            createdAtLabel: artifacts[0]?.uploadedAtLabel,
            createdByName: artifacts[0]?.uploadedByName,
          },
        ]
      : [];
  return {
    reportId,
    testLabel,
    status,
    deliveryState,
    artifacts,
    versions,
    latestVersionId: versions[0]?.versionId,
    pendingReason: options.pendingReason,
    isReuploaded: options.isReuploaded,
    lastUpdatedLabel: options.isReuploaded ? artifacts[0]?.uploadedAtLabel : undefined,
    availableActions: options.availableActions,
  };
}

function buildOrder(partial: {
  id: string;
  orderNumber: string;
  patient: string;
  phone: string;
  tatState: OrderLifecycleViewModel["tatState"];
  tatLabel: string;
  urgency?: OrderLifecycleViewModel["urgency"];
  reports: ReportChipViewModel[];
  deliveryFailure?: OrderLifecycleViewModel["deliveryFailure"];
  lastActivity?: OrderLifecycleViewModel["lastActivity"];
  attentionReasons?: OrderLifecycleViewModel["attentionReasons"];
}): OrderLifecycleViewModel {
  const base: OrderLifecycleViewModel = {
    taskId: oid(partial.id),
    orderNumber: partial.orderNumber,
    patientKey: patientKey(partial.patient, partial.phone),
    patientName: partial.patient,
    patientPhone: partial.phone,
    tatState: partial.tatState,
    tatLabel: partial.tatLabel,
    urgency: partial.urgency ?? "ROUTINE",
    reports: partial.reports,
    nextAction: {
      line: "",
      showSendAvailable: false,
      showUpload: false,
      readyReportIds: [],
    },
    lastActivity: partial.lastActivity ?? { atLabel: "12m ago", byName: "Priya" },
    operationalUpdatedAtIso: new Date().toISOString(),
    slaAnchorIso: new Date().toISOString(),
    attentionReasons: partial.attentionReasons ?? [],
    isFullyComplete: false,
    readyToSendCount: 0,
    hasPendingUpload: false,
    deliveryFailure: partial.deliveryFailure,
  };
  return recomputeOrderDerived(base);
}

/** Rich demo set covering the operational attention + filter scenarios. */
export const ORDER_LIFECYCLE_DEMO_ORDERS: OrderLifecycleViewModel[] = [
  buildOrder({
    id: "rahul-1",
    orderNumber: "DX2045",
    patient: "Rahul Sharma",
    phone: "9876500001",
    tatState: "near_breach",
    tatLabel: "TAT breach in 20m",
    reports: [
      chip(rid("cbc-sent"), "CBC", "sent", [art("c1", "cbc_report_updated.pdf", "application/pdf", "12:31 PM")], {
        isReuploaded: true,
      }),
      chip(rid("lipid-ready"), "Lipid", "ready", [art("l1", "lipid_signed.pdf", "application/pdf")]),
      chip(rid("glucose-sent"), "Glucose", "sent", [art("g1", "glucose_report_v1.pdf", "application/pdf")]),
      chip(rid("abpm-pend"), "ABPM", "pending"),
    ],
    attentionReasons: ["stuck_partial"],
    lastActivity: { atLabel: "4m ago", byName: "Priya" },
  }),
  buildOrder({
    id: "rahul-fail",
    orderNumber: "DX2046",
    patient: "Rahul Sharma",
    phone: "9876500001",
    tatState: "breached",
    tatLabel: "TAT breached",
    urgency: "URGENT",
    reports: [
      chip(rid("cbc-fail"), "CBC", "failed", [art("cf1", "cbc_report_v1.pdf", "application/pdf")]),
      chip(rid("lft-pend"), "LFT", "pending"),
    ],
    deliveryFailure: {
      reportId: rid("cbc-fail"),
      testLabel: "CBC",
      reason: "Invalid mobile number",
      phone: "9876500001",
    },
    attentionReasons: ["delivery_failed", "tat_breached"],
    lastActivity: { atLabel: "2m ago", byName: "Amit" },
  }),
  buildOrder({
    id: "priya-1",
    orderNumber: "DX2047",
    patient: "Priya Patil",
    phone: "9876500002",
    tatState: "near_breach",
    tatLabel: "TAT breach in 10m",
    urgency: "STAT",
    reports: [
      chip(rid("thyroid-pend"), "Thyroid", "pending"),
      chip(rid("vitd-pend"), "Vitamin D", "pending"),
    ],
    attentionReasons: ["stat_pending", "tat_breached"],
    lastActivity: { atLabel: "8m ago", byName: "Neha" },
  }),
  buildOrder({
    id: "rajesh-1",
    orderNumber: "DX2048",
    patient: "Rajesh Kumar",
    phone: "9876500003",
    tatState: "safe",
    tatLabel: "TAT: 1h left",
    urgency: "STAT",
    reports: [chip(rid("cbc-stat"), "CBC", "pending")],
    attentionReasons: ["stat_pending"],
    lastActivity: { atLabel: "15m ago", byName: "Suresh" },
  }),
  buildOrder({
    id: "anita-1",
    orderNumber: "DX2049",
    patient: "Anita Desai",
    phone: "9876500004",
    tatState: "safe",
    tatLabel: "TAT: 2h left",
    reports: [
      chip(rid("mri-ready"), "MRI", "ready", [art("m1", "mri_report.pdf", "application/pdf")]),
      chip(rid("xray-ready"), "X-Ray", "ready", [
        art("x1", "xray_front.png", "image/png"),
        art("x2", "xray_lateral.png", "image/png"),
      ]),
    ],
    lastActivity: { atLabel: "6m ago", byName: "Priya" },
  }),
  buildOrder({
    id: "vikram-1",
    orderNumber: "DX2050",
    patient: "Vikram Singh",
    phone: "9876500005",
    tatState: "safe",
    tatLabel: "TAT: 3h left",
    reports: [
      chip(rid("culture-pend"), "Culture", "pending"),
      chip(rid("cbc-culture-sent"), "CBC", "sent", [art("cc1", "cbc_final.pdf", "application/pdf")]),
    ],
    attentionReasons: ["stuck_partial"],
    lastActivity: { atLabel: "1h ago", byName: "Kiran" },
  }),
  buildOrder({
    id: "meera-1",
    orderNumber: "DX2051",
    patient: "Meera Nair",
    phone: "9876500006",
    tatState: "safe",
    tatLabel: "TAT: 45m left",
    reports: [
      chip(rid("ecg-pend"), "ECG", "pending"),
      chip(rid("lipid-meera-sent"), "Lipid", "sent", [art("me1", "lipid.pdf", "application/pdf")]),
    ],
    lastActivity: { atLabel: "20m ago", byName: "Priya" },
  }),
  buildOrder({
    id: "arjun-1",
    orderNumber: "DX2052",
    patient: "Arjun Mehta",
    phone: "9876500007",
    tatState: "safe",
    tatLabel: "TAT: 1h 30m left",
    reports: [chip(rid("hba1c-pend"), "HbA1c", "pending")],
    lastActivity: { atLabel: "30m ago", byName: "Amit" },
  }),
  buildOrder({
    id: "sneha-1",
    orderNumber: "DX2053",
    patient: "Sneha Reddy",
    phone: "9876500008",
    tatState: "safe",
    tatLabel: "TAT: 2h left",
    reports: [
      chip(rid("abpm-dev-pend"), "ABPM", "pending"),
      chip(rid("holter-sent"), "Holter", "sent", [art("h1", "holter_summary.pdf", "application/pdf")]),
    ],
    lastActivity: { atLabel: "45m ago", byName: "Neha" },
  }),
  buildOrder({
    id: "karan-1",
    orderNumber: "DX2054",
    patient: "Karan Joshi",
    phone: "9876500009",
    tatState: "safe",
    tatLabel: "TAT: 4h left",
    reports: [
      chip(rid("k1-ready"), "CBC", "ready", [
        art("k1a", "cbc_signed.pdf", "application/pdf"),
        art("k1b", "cbc_machine.csv", "text/csv"),
      ]),
      chip(rid("k2-ready"), "LFT", "ready", [art("k2a", "lft_panel.pdf", "application/pdf")]),
      chip(rid("k3-ready"), "KFT", "ready", [art("k3a", "kft_panel.pdf", "application/pdf")]),
    ],
    lastActivity: { atLabel: "5m ago", byName: "Priya" },
  }),
  buildOrder({
    id: "deepa-1",
    orderNumber: "DX2055",
    patient: "Deepa Iyer",
    phone: "9876500010",
    tatState: "safe",
    tatLabel: "TAT: 5h left",
    reports: [
      chip(rid("d1-sent"), "CBC", "sent", [art("d1a", "cbc_report_updated.pdf", "application/pdf", "12:31 PM")], {
        isReuploaded: true,
      }),
      chip(rid("d2-sent"), "Thyroid", "sent", [art("d2a", "thyroid.pdf", "application/pdf")]),
    ],
    lastActivity: { atLabel: "1h ago", byName: "Suresh" },
  }),
  buildOrder({
    id: "multi-1",
    orderNumber: "DX2056",
    patient: "Rahul Sharma",
    phone: "9876500001",
    tatState: "safe",
    tatLabel: "TAT: 6h left",
    reports: [chip(rid("multi-vit"), "Vitamin B12", "pending")],
  }),
  buildOrder({
    id: "multi-2",
    orderNumber: "DX2057",
    patient: "Rahul Sharma",
    phone: "9876500001",
    tatState: "safe",
    tatLabel: "TAT: 6h left",
    reports: [chip(rid("multi-iron"), "Iron", "pending")],
  }),
  buildOrder({
    id: "multi-3",
    orderNumber: "DX2058",
    patient: "Rahul Sharma",
    phone: "9876500001",
    tatState: "safe",
    tatLabel: "TAT: 5h left",
    reports: [chip(rid("multi-urine"), "Urine", "ready", [art("u1", "urine.pdf", "application/pdf")])],
  }),
  buildOrder({
    id: "multi-4",
    orderNumber: "DX2059",
    patient: "Rahul Sharma",
    phone: "9876500001",
    tatState: "safe",
    tatLabel: "TAT: 5h left",
    reports: [chip(rid("multi-stool"), "Stool", "sent", [art("s1", "stool.pdf", "application/pdf")])],
  }),
  buildOrder({
    id: "multi-5",
    orderNumber: "DX2060",
    patient: "Rahul Sharma",
    phone: "9876500001",
    tatState: "safe",
    tatLabel: "TAT: 4h left",
    reports: [chip(rid("multi-psa"), "PSA", "pending")],
  }),
  buildOrder({
    id: "reupload-ready-1",
    orderNumber: "DX2062",
    patient: "Nisha Gupta",
    phone: "9876500011",
    tatState: "safe",
    tatLabel: "TAT: 2h left",
    reports: [
      chip(rid("updated-lft"), "LFT", "ready", [
        art("updated-lft", "lft_report_updated.pdf", "application/pdf", "Just now"),
      ], {
        isReuploaded: true,
      }),
    ],
    lastActivity: { atLabel: "just now", byName: "Neha" },
  }),
  buildOrder({
    id: "delivered-single-1",
    orderNumber: "DX2064",
    patient: "Asha Rao",
    phone: "9876500013",
    tatState: "safe",
    tatLabel: "TAT: 4h left",
    reports: [chip(rid("asha-cbc"), "CBC", "sent", [art("asha-cbc", "cbc_report_v1.pdf", "application/pdf", "10:42 AM")])],
    lastActivity: { atLabel: "10:42 AM", byName: "Priya" },
  }),
  buildOrder({
    id: "multi-ready-1",
    orderNumber: "DX2063",
    patient: "Rohit Bansal",
    phone: "9876500012",
    tatState: "safe",
    tatLabel: "TAT: 3h left",
    reports: Array.from({ length: 4 }, (_, i) =>
      chip(rid(`batch-${i}`), `Test ${i + 1}`, "ready", [
        art(`b${i}`, `test_${i + 1}.pdf`, "application/pdf"),
      ]),
    ),
    lastActivity: { atLabel: "1m ago", byName: "Priya" },
  }),
].map(recomputeOrderDerived);

export {
  buildAttentionItems,
  computeCompletionKpis,
  countReadyToSendReports,
  filterOrdersByChip,
  getCompletedToday,
  groupOrdersByPatient,
  orderPriorityScore,
  searchOrders,
  sortActiveOrders,
  sortOrdersByOperationalPriority,
} from "@/lib/labs/reports/completion/order-lifecycle-queue-utils";
