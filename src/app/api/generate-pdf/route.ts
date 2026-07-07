import { NextResponse } from 'next/server';
import { generateCongratulationsDoc } from '@/lib/document-generator';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { name, location, date } = await request.json();

    if (!name || !location) {
      return NextResponse.json({ error: 'Name and Location are required' }, { status: 400 });
    }

    // Fetch custom document template config
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let docConfig = undefined;
    if (user) {
      const { data: docTemplate } = await supabase
        .from('message_templates')
        .select('buttons')
        .eq('user_id', user.id)
        .eq('name', '__document_config')
        .maybeSingle();
      if (docTemplate) {
        docConfig = docTemplate.buttons || undefined;
      }
    }

    const today = new Date();
    const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const finalDate = date ? String(date).trim() : todayStr;

    const pdfBytes = await generateCongratulationsDoc({
      name: String(name).trim(),
      location: String(location).trim(),
      date: finalDate,
    }, docConfig);

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Approval.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('[generate-pdf] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
