import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ApplyFormClient from './apply-form-client'

// Initialize admin client to fetch contact details securely on the server
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PageProps {
  params: Promise<{
    contactId: string
  }>
}

export default async function ApplyPage(props: PageProps) {
  const { contactId } = await props.params
  const db = getSupabaseAdmin()

  // Fetch contact details
  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('name, phone')
    .eq('id', contactId)
    .maybeSingle()

  if (contactError || !contact) {
    console.error('[apply] Contact not found:', contactId, contactError)
    // Redirect to a default page or show an error
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white font-sans">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="text-red-500 text-5xl font-bold">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-100">Invalid Link</h1>
          <p className="text-slate-400">This application link is invalid or has expired. Please contact support.</p>
        </div>
      </div>
    )
  }

  // Prepopulate form details
  const initialData = {
    contactId,
    name: contact.name || '',
    phone: contact.phone || ''
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-lg z-10">
        <ApplyFormClient initialData={initialData} />
      </div>
    </main>
  )
}
