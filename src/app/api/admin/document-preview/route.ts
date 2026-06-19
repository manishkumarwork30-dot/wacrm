import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCongratulationsDoc } from '@/lib/document-generator';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { config, mockData } = await request.json();

    // Use mock data for previewing if not provided
    const dataToUse = mockData || {
      name: 'Rohan Sharma',
      location: 'Lucknow',
      mobile_no: '9876543210',
      state: 'Uttar Pradesh',
      pin_code: '226001',
      land_size: '250 sqft',
      ownership: 'Owned',
      date: new Date().toISOString(),
    };

    const pdfBuffer = await generateCongratulationsDoc(dataToUse, config);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview.pdf"',
      },
    });
  } catch (error: any) {
    console.error('Error generating document preview:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
