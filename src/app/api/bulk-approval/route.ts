import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { generateCongratulationsDoc, getFonts, getAssets } from '@/lib/document-generator';

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
    const contentType = request.headers.get('content-type') || '';
    let rows: any[] = [];
    let nameKey = 'name';
    let districtKey = 'district';
    let dateKey = 'date';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body.rows || !Array.isArray(body.rows)) {
        return NextResponse.json({ error: 'Missing rows array in request body.' }, { status: 400 });
      }
      rows = body.rows;
    } else {
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
      const foundNameKey     = findKey(firstRow, 'name');
      const foundDistrictKey = findKey(firstRow, 'district', 'location', 'city', 'area');
      const foundDateKey     = findKey(firstRow, 'date');

      if (!foundNameKey) {
        return NextResponse.json(
          { error: 'Missing "Name" column in Excel. Please add a column named "Name".' },
          { status: 400 }
        );
      }
      if (!foundDistrictKey) {
        return NextResponse.json(
          { error: 'Missing "District" (or "Location") column in Excel.' },
          { status: 400 }
        );
      }

      nameKey = foundNameKey;
      districtKey = foundDistrictKey;
      dateKey = foundDateKey || 'date';
      rows = rawRows;
    }

    // Limit rows
    const rowsToProcess = rows.slice(0, MAX_ROWS);
    const today = new Date();
    const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    // Build ZIP
    const zip = new JSZip();
    const errors: string[] = [];
    const nameCount: Record<string, number> = {};

    // 1. Pre-warm fonts and assets cache to avoid redundant network fetch requests
    await Promise.all([getFonts(), getAssets()]);

    // 2. Map rows to PDF generation promises (running in parallel)
    const pdfPromises = rowsToProcess.map(async (row, i) => {
      const name     = String(row[nameKey] || '').trim();
      const district = String(row[districtKey] || '').trim();
      const date     = row[dateKey] ? String(row[dateKey] || '').trim() : '';

      if (!name || !district) {
        errors.push(`Row ${i + 2}: skipped (empty name or district)`);
        return null;
      }

      try {
        const pdfBytes = await generateCongratulationsDoc({
          name,
          location: district,
          date: date || todayStr,
        });

        // Format filename as "name.pdf" (lowercase/same case, clean special chars)
        // If duplicate name exists, append counter e.g., "Manish 1.pdf", "Manish 2.pdf"
        const cleanName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
        const baseName = cleanName || 'Approval';
        const key = baseName.toLowerCase();

        let filename = '';
        if (nameCount[key] === undefined) {
          nameCount[key] = 0;
          filename = `${baseName}.pdf`;
        } else {
          nameCount[key]++;
          filename = `${baseName} ${nameCount[key]}.pdf`;
        }

        return { filename, pdfBytes };
      } catch (rowErr: any) {
        console.error(`Error generating PDF for row ${i + 2} (${name}):`, rowErr);
        errors.push(`Row ${i + 2} (${name}): ${rowErr.message}`);
        return null;
      }
    });

    const results = await Promise.all(pdfPromises);

    // 3. Add successfully generated PDFs to the ZIP
    for (const res of results) {
      if (res) {
        zip.file(res.filename, res.pdfBytes);
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
