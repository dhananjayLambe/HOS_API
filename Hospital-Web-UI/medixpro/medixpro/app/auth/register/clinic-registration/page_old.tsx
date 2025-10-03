"use client"

import ClinicOnboardingForm from "@/components/clinic/clinic-onboarding-form"

export default function ClinicOnboardingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="onboard-card">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-pretty">Clinic Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Provide clinic details for registration and official communication.
          </p>
        </header>
        <ClinicOnboardingForm />
      </div>

      <style jsx>{`
        .onboard-card {
          background: var(--card);
          color: var(--card-foreground);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.25rem; /* p-5 */
          box-shadow:
            0 1px 1px rgba(0, 0, 0, 0.04),
            0 10px 20px rgba(0, 0, 0, 0.04);
        }

        @media (min-width: 768px) {
          .onboard-card {
            padding: 1.5rem; /* p-6 */
          }
        }

        /* Subtle accent for legends inside the form */
        :global(.onboard-card fieldset > legend) {
          font-size: 0.95rem;
          line-height: 1.5;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding-left: 0.25rem;
          border-left: 3px solid var(--primary);
        }

        /* Tighten spacing in inputs within this card for a modern feel */
        :global(.onboard-card input),
        :global(.onboard-card textarea),
        :global(.onboard-card select) {
          border-radius: calc(var(--radius) - 2px);
        }
      `}</style>
    </main>
  )
}
