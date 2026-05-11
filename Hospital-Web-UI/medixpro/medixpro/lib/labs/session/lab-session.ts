import { backendAxiosClient } from "@/lib/axiosClient";
import type { LabSession } from "./lab-session-types";

export async function fetchLabSession(): Promise<LabSession> {
  const { data } = await backendAxiosClient.get<LabSession>("labs/me/");
  return data;
}
