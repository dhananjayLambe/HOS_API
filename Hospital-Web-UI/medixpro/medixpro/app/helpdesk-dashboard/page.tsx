import { redirect } from "next/navigation";

export default function HelpdeskDashboardLegacyRedirect() {
  redirect("/helpdesk/queue");
}
