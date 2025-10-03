"use client"

import ClinicOnboardingForm from "@/components/clinic/clinic-onboarding-form"

export default function ClinicOnboardingPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="onboard-card">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-balance bg-gradient-to-br from-purple-600 via-violet-600 to-purple-500 bg-clip-text text-transparent">
              Clinic Onboarding
            </h1>
            <p className="text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
              Complete the registration process to get your clinic approved and start using our EMR system
            </p>
          </header>
          <ClinicOnboardingForm />
        </div>
      </div>

      <style jsx>{`
        .onboard-card {
          background: white;
          color: rgb(15 23 42);
          border: 1px solid rgb(226 232 240);
          border-radius: 1rem;
          padding: 2rem;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.03),
            0 8px 24px rgba(0, 0, 0, 0.06),
            0 16px 48px rgba(0, 0, 0, 0.04);
        }

        @media (min-width: 768px) {
          .onboard-card {
            padding: 3rem;
          }
        }

        /* Enhanced fieldset legend with purple accent bar */
        :global(.onboard-card fieldset > legend) {
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1.5;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 0.75rem;
          border-left: 4px solid rgb(147 51 234);
          margin-bottom: 0.5rem;
          color: rgb(15 23 42);
        }

        :global(.onboard-card input),
        :global(.onboard-card textarea),
        :global(.onboard-card select) {
          border-radius: 0.375rem;
          transition: all 150ms ease;
        }

        :global(.onboard-card input:focus),
        :global(.onboard-card textarea:focus),
        :global(.onboard-card select:focus) {
          box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
          border-color: rgb(147 51 234);
        }

        /* Modern progress bar with purple gradient and glow */
        :global(.onboard-card .progress) {
          height: 10px;
          width: 100%;
          background: rgb(241 245 249);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgb(226 232 240);
          position: relative;
        }
        :global(.onboard-card .progress-bar) {
          height: 100%;
          background: linear-gradient(90deg, rgb(147 51 234), rgb(124 58 237));
          width: 0%;
          transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 12px rgba(147, 51, 234, 0.5);
          position: relative;
        }

        :global(.onboard-card .progress-bar::after) {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Modern chip design with purple hover effect */
        :global(.onboard-card .chip) {
          display: inline-flex;
          align-items: center;
          height: 2rem;
          padding: 0 0.875rem;
          background: rgb(248 250 252);
          color: rgb(15 23 42);
          border: 1px solid rgb(226 232 240);
          border-radius: 999px;
          font-size: 0.8125rem;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          transition: all 150ms ease;
        }

        :global(.onboard-card .chip:hover) {
          background: rgb(243 232 255);
          border-color: rgb(147 51 234);
          color: rgb(147 51 234);
        }

        /* Improved summary grid with better spacing */
        :global(.onboard-card .summary-grid) {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 768px) {
          :global(.onboard-card .summary-grid) {
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }
        }

        /* Summary section cards with subtle purple accent on hover */
        :global(.onboard-card .summary-section) {
          background: rgb(248 250 252);
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 1.25rem;
          transition: all 200ms ease;
        }

        :global(.onboard-card .summary-section:hover) {
          background: rgb(250 245 255);
          border-color: rgb(216 180 254);
        }
      `}</style>
    </main>
  )
}
