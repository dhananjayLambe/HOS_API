"use client";

import { create } from "zustand";
import type {
  ConsultationState,
  ConsultationSymptom,
  ConsultationMedicine,
  SymptomDetail,
  ConsultationVitals,
} from "@/lib/consultation-types";
import { DEFAULT_CONSULTATION_STATE } from "@/lib/consultation-types";

type DraftStatus = {
  savedAt: Date | null;
  message: string | null;
};

type ConsultationStore = ConsultationState & {
  draftStatus: DraftStatus;
  selectedSymptomId: string | null;
  setSymptoms: (symptoms: ConsultationSymptom[]) => void;
  addSymptom: (symptom: ConsultationSymptom) => void;
  removeSymptom: (id: string) => void;
  updateSymptomDetail: (id: string, detail: Partial<SymptomDetail>) => void;
  setFindings: (value: string) => void;
  setDiagnosis: (value: string) => void;
  setMedicines: (medicines: ConsultationMedicine[]) => void;
  addMedicine: (medicine: Omit<ConsultationMedicine, "id">) => void;
  updateMedicine: (id: string, patch: Partial<ConsultationMedicine>) => void;
  removeMedicine: (id: string) => void;
  setInvestigations: (value: string) => void;
  setInstructions: (value: string) => void;
  setProcedures: (value: string) => void;
  setDraftStatus: (status: DraftStatus) => void;
  setSelectedSymptomId: (id: string | null) => void;
  setMedicalHistory: (value: string) => void;
  setVitals: (vitals: Partial<ConsultationVitals>) => void;
  setPrescriptionNotes: (value: string) => void;
  setDoctorNotes: (value: string) => void;
  reset: () => void;
};

export const useConsultationStore = create<ConsultationStore>((set, get) => ({
  ...DEFAULT_CONSULTATION_STATE,
  draftStatus: { savedAt: null, message: null },
  selectedSymptomId: null,

  setSymptoms: (symptoms) => set({ symptoms }),
  addSymptom: (symptom) =>
    set((s) => ({ symptoms: [...s.symptoms, symptom] })),
  removeSymptom: (id) =>
    set((s) => ({
      symptoms: s.symptoms.filter((x) => x.id !== id),
      selectedSymptomId: s.selectedSymptomId === id ? null : s.selectedSymptomId,
    })),
  updateSymptomDetail: (id, detail) =>
    set((s) => ({
      symptoms: s.symptoms.map((x) =>
        x.id === id
          ? { ...x, detail: { ...(x.detail ?? {}), ...detail } }
          : x
      ),
    })),

  setFindings: (value) => set({ findings: value }),
  setDiagnosis: (value) => set({ diagnosis: value }),

  setMedicines: (medicines) => set({ medicines }),
  addMedicine: (medicine) =>
    set((s) => ({
      medicines: [
        ...s.medicines,
        { ...medicine, id: `med-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    })),
  updateMedicine: (id, patch) =>
    set((s) => ({
      medicines: s.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  removeMedicine: (id) =>
    set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) })),

  setInvestigations: (value) => set({ investigations: value }),
  setInstructions: (value) => set({ instructions: value }),
  setProcedures: (value) => set({ procedures: value }),

  setDraftStatus: (draftStatus) => set({ draftStatus }),
  setSelectedSymptomId: (selectedSymptomId) => set({ selectedSymptomId }),
  setMedicalHistory: (medicalHistory) => set({ medicalHistory }),
  setVitals: (patch) =>
    set((s) => ({ vitals: { ...s.vitals, ...patch } })),
  setPrescriptionNotes: (prescriptionNotes) => set({ prescriptionNotes }),
  setDoctorNotes: (doctorNotes) => set({ doctorNotes }),
  reset: () =>
    set({
      ...DEFAULT_CONSULTATION_STATE,
      draftStatus: { savedAt: null, message: null },
      selectedSymptomId: null,
    }),
}));
