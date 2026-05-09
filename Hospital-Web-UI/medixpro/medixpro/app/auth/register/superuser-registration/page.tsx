import Link from "next/link"
import { Shield } from "lucide-react"

/**
 * Placeholder for super admin registration. Replace with real onboarding when the flow is ready.
 */
export default function SuperuserRegistrationPlaceholderPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200/80 bg-white p-10 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 p-4 shadow-lg">
            <Shield className="h-10 w-10 text-white" aria-hidden />
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">
          Super admin registration
        </h1>
        <p className="mt-4 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          This step is not implemented yet. The full registration and approval flow will be added
          here in a later release.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/register/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Back to role selection
          </Link>
          <Link
            href="/auth/login/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  )
}
