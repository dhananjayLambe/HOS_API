"use client"

import { CheckCircle2, ArrowRight, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ClinicOnboardingSuccessPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="success-card">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="success-icon-wrapper">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Success Message */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-balance bg-gradient-to-br from-purple-600 via-violet-600 to-purple-500 bg-clip-text text-transparent mb-3">
              Registration Submitted Successfully!
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Thank you for registering your clinic with MedixPro
            </p>
          </header>

          {/* Information Card */}
          <div className="info-card mb-8">
            <div className="flex items-start gap-4">
              <div className="info-icon-wrapper">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">What Happens Next?</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Our admin team will review your clinic registration request. You will receive an approval notification
                  within <span className="font-semibold text-purple-600">24-48 business hours</span>.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Please check your registered email address for updates on your application status.
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps Card */}
          <div className="next-steps-card mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Complete Your Setup</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              While you wait for clinic approval, you can proceed with doctor registration. Both requests will be
              reviewed together, streamlining your onboarding process.
            </p>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-900 font-medium mb-2">💡 Pro Tip</p>
              <p className="text-sm text-purple-800 leading-relaxed">
                Completing doctor registration now ensures your team can start using the EMR system immediately after
                admin approval.
              </p>
            </div>

            <Link href="../doctor-registration" className="block">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold shadow-lg shadow-purple-500/30 transition-all duration-200"
              >
                Proceed to Doctor Registration
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Additional Actions */}
          <div className="text-center pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-4">Need help or have questions?</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/support">
                <Button variant="outline" size="sm">
                  Contact Support
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .success-card {
          background: white;
          color: rgb(15 23 42);
          border: 1px solid rgb(226 232 240);
          border-radius: 1rem;
          padding: 2.5rem;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.03),
            0 8px 24px rgba(0, 0, 0, 0.06),
            0 16px 48px rgba(0, 0, 0, 0.04);
        }

        .success-icon-wrapper {
          width: 96px;
          height: 96px;
          background: linear-gradient(135deg, rgb(147 51 234), rgb(124 58 237));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(147, 51, 234, 0.3);
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .info-card {
          background: rgb(248 250 252);
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .info-icon-wrapper {
          width: 48px;
          height: 48px;
          background: white;
          border: 2px solid rgb(216 180 254);
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .next-steps-card {
          background: white;
          border: 2px solid rgb(216 180 254);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        @media (min-width: 768px) {
          .success-card {
            padding: 3rem;
          }
        }
      `}</style>
    </main>
  )
}
