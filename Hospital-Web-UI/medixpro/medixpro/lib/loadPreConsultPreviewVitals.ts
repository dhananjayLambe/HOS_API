import { isCancel } from "axios";
import { backendAxiosClient } from "@/lib/axiosClient";
import { useConsultationStore } from "@/store/consultationStore";

export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Fetches GET /consultations/pre-consultation/preview/ and maps vitals into the consultation store.
 * Used on start-consultation mount, tab focus/visibility, and manual refresh (helpdesk may save after doctor opened the page).
 */
export async function loadPreConsultPreviewVitals(
  encounterId: string,
  options?: { onSoftError?: (message: string) => void; signal?: AbortSignal }
): Promise<void> {
  const { setVitals, setVitalsLoaded } = useConsultationStore.getState();

  if (!encounterId || !isUuidLike(encounterId)) {
    setVitals({
      weightKg: undefined,
      heightCm: undefined,
      bmi: undefined,
      temperatureF: undefined,
    });
    setVitalsLoaded(true);
    return;
  }

  setVitalsLoaded(false);

  try {
    const res = await backendAxiosClient.get(`/consultations/pre-consultation/preview/`, {
      params: { encounter_id: encounterId },
      signal: options?.signal,
    });

    const data = res.data as Record<string, unknown>;

    if (!data || data.message === "NO_PRECONSULT_DATA" || !data.vitals) {
      setVitals({
        weightKg: undefined,
        heightCm: undefined,
        bmi: undefined,
        temperatureF: undefined,
      });
      setVitalsLoaded(true);
      return;
    }

    const vitalsData = data.vitals as Record<string, unknown>;

    const heightRaw =
      (vitalsData?.height_weight as Record<string, unknown> | undefined)?.height_cm ??
      (vitalsData?.height_weight as Record<string, unknown> | undefined)?.height ??
      vitalsData?.height_cm ??
      vitalsData?.height ??
      null;
    const weightRaw =
      (vitalsData?.height_weight as Record<string, unknown> | undefined)?.weight_kg ??
      (vitalsData?.height_weight as Record<string, unknown> | undefined)?.weight ??
      vitalsData?.weight_kg ??
      vitalsData?.weight ??
      null;
    const tempObj = vitalsData?.temperature as Record<string, unknown> | undefined;
    const tempUnitRaw =
      (tempObj?.unit as string | undefined) ??
      (vitalsData?.temperature_unit as string | undefined) ??
      "c";
    const tempUnit = tempUnitRaw.toLowerCase();
    const temperatureRaw =
      tempObj?.temperature ??
      tempObj?.value ??
      vitalsData?.temperatureF ??
      vitalsData?.temperature ??
      null;

    let bmi: string | undefined;
    const heightNum = heightRaw != null && heightRaw !== "" ? Number(heightRaw) : NaN;
    const weightNum = weightRaw != null && weightRaw !== "" ? Number(weightRaw) : NaN;

    if (!Number.isNaN(heightNum) && !Number.isNaN(weightNum) && heightNum > 0 && weightNum > 0) {
      const heightMeters = heightNum / 100;
      const rawBmi = weightNum / (heightMeters * heightMeters);
      bmi = rawBmi.toFixed(2);
    }

    let temperatureStr: string | undefined;
    if (temperatureRaw != null && String(temperatureRaw).trim() !== "") {
      if (typeof temperatureRaw === "object" && temperatureRaw !== null) {
        const tr = temperatureRaw as { value?: unknown; reading?: unknown };
        const maybeVal = tr.value ?? tr.reading ?? null;
        if (maybeVal != null && String(maybeVal).trim() !== "") {
          temperatureStr = String(maybeVal);
        }
      } else {
        temperatureStr = String(temperatureRaw);
      }
    }
    if (temperatureStr != null && temperatureStr !== "") {
      const n = Number(temperatureStr);
      if (!Number.isNaN(n) && tempUnit === "f") {
        // Doctor-side UI is Celsius.
        temperatureStr = (((n - 32) * 5) / 9).toFixed(2);
      }
    }

    setVitals({
      weightKg: weightRaw != null && String(weightRaw) !== "" ? String(weightRaw) : undefined,
      heightCm: heightRaw != null && String(heightRaw) !== "" ? String(heightRaw) : undefined,
      temperatureF: temperatureStr,
      bmi,
    });
    setVitalsLoaded(true);
  } catch (err: unknown) {
    if (isCancel(err) || options?.signal?.aborted) {
      setVitalsLoaded(true);
      return;
    }
    const ax = err as { response?: { status?: number; data?: { detail?: string } } };
    const detail = String(ax.response?.data?.detail || "").toLowerCase();
    const isExpectedPreview400 =
      ax.response?.status === 400 &&
      (detail.includes("cancelled") || detail.includes("no show") || detail.includes("no_show"));
    if (isExpectedPreview400) {
      setVitalsLoaded(true);
      return;
    }
    options?.onSoftError?.("Unable to load vitals from pre-consultation.");
    setVitalsLoaded(true);
  }
}
