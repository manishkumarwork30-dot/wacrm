import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { generateCongratulationsDoc } from '@/lib/document-generator';

const MAX_ROWS = 100;

/**
 * POST /api/bulk-approval
 * Accepts: multipart/form-data with field `file` (.xlsx / .xls)
 * Returns: application/zip binary with one PDF per row
 *
 * Expected columns (case-insensitive):
 *   Name      – applicant name
 *   District  – district / location  (also accepts "Location")
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext ?? '')) {
      return NextResponse.json(
        { error: 'Only .xlsx and .xls files are supported.' },
        { status: 400 }
      );
    }

    // Read the workbook
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON rows
    const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
    });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'The Excel file is empty.' }, { status: 400 });
    }

    // Normalise column keys (case-insensitive lookup)
    const findKey = (row: Record<string, string>, ...candidates: string[]) => {
      const keys = Object.keys(row).map(k => k.trim().toLowerCase());
      for (const c of candidates) {
        const idx = keys.indexOf(c.toLowerCase());
        if (idx !== -1) return Object.keys(row)[idx];
      }
      return null;
    };

    const firstRow = rawRows[0];
    const nameKey     = findKey(firstRow, 'name');
    const districtKey = findKey(firstRow, 'district', 'location', 'city', 'area');

    if (!nameKey) {
      return NextResponse.json(
        { error: 'Missing "Name" column in Excel. Please add a column named "Name".' },
        { status: 400 }
      );
    }
    if (!districtKey) {
      return NextResponse.json(
        { error: 'Missing "District" (or "Location") column in Excel.' },
        { status: 400 }
      );
    }

    // Limit rows
    const rows = rawRows.slice(0, MAX_ROWS);
    const today = new Date();
    const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    // Build ZIP
    const zip = new JSZip();
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name     = String(row[nameKey] || '').trim();
      const district = String(row[districtKey] || '').trim();

      if (!name || !district) {
        errors.push(`Row ${i + 2}: skipped (empty name or district)`);
        continue;
      }

      try {
        const pdfBytes = await generateCongratulationsDoc({
          name,
          location: district,
          date: todayStr,
        });

        // Safe filename: strip special chars
        const safeName     = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
        const safeDistrict = district.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
        const filename     = `Approval_${safeName}_${safeDistrict}.pdf`;

        zip.file(filename, pdfBytes);
      } catch (rowErr: any) {
        console.error(`Error generating PDF for row ${i + 2} (${name}):`, rowErr);
        errors.push(`Row ${i + 2} (${name}): ${rowErr.message}`);
      }
    }

    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      return NextResponse.json(
        { error: 'No PDFs could be generated. Check your Excel data.' },
        { status: 400 }
      );
    }

    // Add a summary of any skipped rows
    if (errors.length > 0) {
      zip.file('_errors.txt', errors.join('\n'));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    // Convert Node Buffer → Uint8Array (valid BodyInit in TypeScript / Next.js)
    const zipBytes = new Uint8Array(zipBuffer);

    return new Response(zipBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="HTL_Approvals_${todayStr.replace(/\//g, '-')}.zip"`,
        'Content-Length': zipBytes.length.toString(),
        'X-Generated-Count': fileCount.toString(),
        'X-Error-Count': errors.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('[bulk-approval] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
