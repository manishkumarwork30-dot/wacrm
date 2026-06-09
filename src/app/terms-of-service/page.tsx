import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-extrabold text-white mb-6">Terms of Service</h1>
          <p className="text-slate-400 mb-6">Last Updated: May 29, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                By accessing or using our WhatsApp CRM application, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">2. Service Usage</h2>
              <p className="text-slate-300 leading-relaxed">
                You are responsible for obtaining all necessary permissions and consents before sending messages to any recipients via the CRM. Any spam or policy violation on WhatsApp API is your sole responsibility.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">3. Meta API Integration</h2>
              <p className="text-slate-300 leading-relaxed">
                Our application integrates with Meta’s WhatsApp Business Cloud API. Your use of this service must adhere to all terms, guidelines, and policies issued by Meta.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">4. Limitation of Liability</h2>
              <p className="text-slate-300 leading-relaxed">
                We shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use or inability to use the CRM services, including any account bans by Meta.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">5. Modification of Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                We reserve the right to modify these terms at any time. Your continued use of the application following any changes indicates your acceptance of the updated terms.
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
