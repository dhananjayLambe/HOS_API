import { redirect } from "next/navigation";

export default function HelpdeskIndexPage() {
  redirect("/helpdesk/queue");
}
