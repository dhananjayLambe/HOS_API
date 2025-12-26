import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

interface VerificationStatusProps {
  status: "verified" | "pending" | "rejected" | "not_submitted"
}

export function VerificationStatus({ status }: VerificationStatusProps) {
  const statusConfig = {
    verified: {
      label: "Verified",
      icon: CheckCircle2,
      variant: "default" as const,
      className: "bg-green-500/10 text-green-700 hover:bg-green-500/20",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      variant: "secondary" as const,
      className: "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20",
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      variant: "destructive" as const,
      className: "bg-red-500/10 text-red-700 hover:bg-red-500/20",
    },
    not_submitted: {
      label: "Not Submitted",
      icon: XCircle,
      variant: "outline" as const,
      className: "text-muted-foreground",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}
