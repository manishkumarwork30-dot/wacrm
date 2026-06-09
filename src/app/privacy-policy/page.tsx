import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">WA CRM</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-xl">
          <h1 className="text-3xl font-extrabold text-white mb-6">Privacy Policy</h1>
          <p className="text-slate-400 mb-6">Last Updated: May 29, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p className="text-slate-300 leading-relaxed">
                We only collect information necessary to provide and improve our WhatsApp CRM services. This includes your account details, phone number configurations, and messages processed through the CRM interface. We do not sell or share this information with third parties.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Information</h2>
              <p className="text-slate-300 leading-relaxed">
                We use the collected information to route messages, trigger user-defined automations, manage contacts, and authenticate access to the dashboard.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">3. Data Protection and Security</h2>
              <p className="text-slate-300 leading-relaxed">
                We implement industry-standard encryption and security measures (such as AES-256 encryption for access tokens) to safeguard your data from unauthorized access or disclosure.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">4. Third-Party Integrations</h2>
              <p className="text-slate-300 leading-relaxed">
                This service integrates with Meta’s WhatsApp Business Cloud API. Your use of the integration is also subject to Meta's privacy policies.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">5. Contact Us</h2>
              <p className="text-slate-300 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at: <a href="mailto:jyotirana22333@gmail.com" className="text-primary hover:underline">jyotirana22333@gmail.com</a>
              </p>
            </div>
          </section>

          <div className="mt-8 pt-8 border-t border-slate-800 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
