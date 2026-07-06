import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

// Cache for external logo images
const _logoCache = new Map<string, Promise<Buffer | null>>();
async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  let promise = _logoCache.get(url);
  if (!promise) {
    promise = (async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      } catch (e) {
        console.error(`[ID Card] Failed to fetch logo ${url}:`, e);
      }
      return null;
    })();
    _logoCache.set(url, promise);
  }
  return promise;
}

// Draw a barcode as vector rectangles in PDFKit
function drawBarcode(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, code: string) {
  // A clean, simple barcode encoding using standard patterns
  const cleanCode = (code || 'EMPLOYEE').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const patternMap: Record<string, string> = {
    'A': '101001101', 'B': '101100101', 'C': '110100101', 'D': '101001011',
    'E': '110100101', 'F': '101100101', 'G': '101001101', 'H': '1101001101',
    'I': '1011001101', 'J': '1010011011', '0': '1010011011', '1': '110100103',
    '2': '101100103', '3': '1101100101', '4': '101001101', '5': '1101001101',
    '6': '1011001101', '7': '101001011', '8': '1101001011', '9': '1011001011'
  };

  let binaryString = '1011011010'; // Start sentinel
  for (const char of cleanCode) {
    binaryString += (patternMap[char] || '101001101') + '0';
  }
  binaryString += '101101101'; // Stop sentinel

  const stripeWidth = width / binaryString.length;
  doc.save();
  doc.fillColor('#000000');
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === '1') {
      doc.rect(x + i * stripeWidth, y, stripeWidth, height).fill();
    }
  }
  doc.restore();
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      name = 'Agent Name',
      designation = 'Field Executive',
      idNumber = 'HTL-2026-0001',
      aadharNo = 'XXXX XXXX 1234',
      email = 'agent@htlnetwork.com',
      phone = '+91 99999 88888',
      validUpto = '2031',
      companyName = 'HTL NETWORK',
      logoUrl = 'https://htlnetwork.com/assets/images/logo.png',
      photoBase64 = '', // Base64 uploaded photo
      themeColor = '#0000ff', // default blue
      orientation = 'vertical' // vertical or horizontal
    } = data;

    // Mask Aadhaar to only show last 4 digits
    const cleanAadhar = (aadharNo || '').replace(/\s/g, '');
    const maskedAadhar = cleanAadhar.length >= 4 
      ? `XXXX XXXX ${cleanAadhar.substring(cleanAadhar.length - 4)}` 
      : 'XXXX XXXX 1234';

    // Format validUpto text
    const displayValidity = `Valid Upto: ${validUpto}`;

    // Dimensions: Standard CR-80 card size
    // Vertical: 54mm width (153pt) x 85.6mm height (242pt)
    // Horizontal: 85.6mm width (242pt) x 54mm height (153pt)
    const cardWidth = orientation === 'horizontal' ? 242 : 153;
    const cardHeight = orientation === 'horizontal' ? 153 : 242;

    const doc = new PDFDocument({
      size: [cardWidth, cardHeight],
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    const pdfPromise = new Promise<Uint8Array>((resolve) => {
      doc.on('end', () => resolve(new Uint8Array(Buffer.concat(buffers))));
    });

    // Load photo buffer
    let photoBuffer: Buffer | null = null;
    if (photoBase64 && photoBase64.includes(';base64,')) {
      try {
        photoBuffer = Buffer.from(photoBase64.split(';base64,')[1], 'base64');
      } catch (err) {
        console.error('Error parsing uploaded photo base64:', err);
      }
    }

    // Load company logo
    const logoBuffer = await fetchLogoBuffer(logoUrl);

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1: FRONT SIDE
    // ─────────────────────────────────────────────────────────────────────────
    
    // Background card border & base
    doc.rect(0, 0, cardWidth, cardHeight).fillColor('#ffffff').fill();
    doc.rect(0, 0, cardWidth, cardHeight).strokeColor('#e2e8f0').lineWidth(2).stroke();

    // Top Header Banner (Theme Color)
    const headerHeight = orientation === 'horizontal' ? 32 : 36;
    doc.rect(1, 1, cardWidth - 2, headerHeight).fillColor(themeColor).fill();

    // Draw Company Name & Logo in Header
    doc.fillColor('#ffffff');
    if (logoBuffer) {
      try {
        const logoWidth = 24;
        const logoHeight = 24;
        doc.image(logoBuffer, 8, (headerHeight - logoHeight) / 2 + 1, { width: logoWidth, height: logoHeight });
        doc.font('Helvetica-Bold').fontSize(orientation === 'horizontal' ? 10 : 8)
           .text(companyName, 38, (headerHeight - 8) / 2 + 1, { width: cardWidth - 42, lineBreak: false });
      } catch {
        doc.font('Helvetica-Bold').fontSize(8).text(companyName, 8, (headerHeight - 8) / 2 + 1, { align: 'center', width: cardWidth - 16 });
      }
    } else {
      doc.font('Helvetica-Bold').fontSize(8).text(companyName, 8, (headerHeight - 8) / 2 + 1, { align: 'center', width: cardWidth - 16 });
    }

    // Footer/Valid Bar (Theme Color Accent)
    const footerHeight = 14;
    doc.rect(1, cardHeight - footerHeight - 1, cardWidth - 2, footerHeight).fillColor(themeColor).fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6)
       .text(displayValidity, 0, cardHeight - footerHeight + 4, { align: 'center', width: cardWidth });

    if (orientation === 'vertical') {
      // ── Vertical Front Side Layout ──
      
      // Render Circular Profile Photo Frame
      const photoSize = 48;
      const photoX = (cardWidth - photoSize) / 2;
      const photoY = headerHeight + 10;

      // Outer Ring
      doc.circle(cardWidth / 2, photoY + photoSize / 2, photoSize / 2 + 2).strokeColor(themeColor).lineWidth(1.5).stroke();

      if (photoBuffer) {
        try {
          doc.save();
          doc.circle(cardWidth / 2, photoY + photoSize / 2, photoSize / 2).clip();
          doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize });
          doc.restore();
        } catch {
          // Fallback gray circle with initials
          doc.circle(cardWidth / 2, photoY + photoSize / 2, photoSize / 2).fillColor('#cbd5e1').fill();
          doc.fillColor('#475569').font('Helvetica-Bold').fontSize(14).text(name.charAt(0), photoX, photoY + 16, { align: 'center', width: photoSize });
        }
      } else {
        doc.circle(cardWidth / 2, photoY + photoSize / 2, photoSize / 2).fillColor('#cbd5e1').fill();
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(14).text(name.charAt(0), photoX, photoY + 16, { align: 'center', width: photoSize });
      }

      // Name & Designation
      const textY = photoY + photoSize + 10;
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9).text(name, 4, textY, { align: 'center', width: cardWidth - 8 });
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7).text(designation, 4, textY + 12, { align: 'center', width: cardWidth - 8 });

      // ID and Aadhaar Info Block
      const infoY = textY + 28;
      doc.fillColor('#334155').font('Helvetica').fontSize(6.5);
      doc.text(`ID No: ${idNumber}`, 10, infoY, { align: 'center', width: cardWidth - 20 });
      doc.text(`Aadhaar: ${maskedAadhar}`, 10, infoY + 10, { align: 'center', width: cardWidth - 20 });

    } else {
      // ── Horizontal Front Side Layout ──
      
      // Profile Photo on the Left
      const photoSize = 52;
      const photoX = 12;
      const photoY = headerHeight + 12;

      doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 2).strokeColor(themeColor).lineWidth(1.5).stroke();

      if (photoBuffer) {
        try {
          doc.save();
          doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).clip();
          doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize });
          doc.restore();
        } catch {
          doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).fillColor('#cbd5e1').fill();
          doc.fillColor('#475569').font('Helvetica-Bold').fontSize(16).text(name.charAt(0), photoX, photoY + 18, { align: 'center', width: photoSize });
        }
      } else {
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).fillColor('#cbd5e1').fill();
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(16).text(name.charAt(0), photoX, photoY + 18, { align: 'center', width: photoSize });
      }

      // Details on the Right
      const rightContentX = photoX + photoSize + 12;
      const contentY = headerHeight + 10;

      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10).text(name, rightContentX, contentY, { width: cardWidth - rightContentX - 8 });
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7.5).text(designation, rightContentX, contentY + 13, { width: cardWidth - rightContentX - 8 });

      // ID and Aadhaar
      doc.fillColor('#334155').font('Helvetica').fontSize(6.5);
      doc.text(`ID No: ${idNumber}`, rightContentX, contentY + 26);
      doc.text(`Aadhaar: ${maskedAadhar}`, rightContentX, contentY + 36);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2: BACK SIDE
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();

    // Background card border & base
    doc.rect(0, 0, cardWidth, cardHeight).fillColor('#ffffff').fill();
    doc.rect(0, 0, cardWidth, cardHeight).strokeColor('#e2e8f0').lineWidth(2).stroke();

    // Header strip
    doc.rect(1, 1, cardWidth - 2, 8).fillColor(themeColor).fill();

    // Footer strip
    doc.rect(1, cardHeight - 8, cardWidth - 2, 7).fillColor(themeColor).fill();

    if (orientation === 'vertical') {
      // ── Vertical Back Side Layout ──
      
      // Title
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7).text('TERMS & CONDITIONS', 8, 16, { align: 'center', width: cardWidth - 16 });
      
      // Instruction terms
      doc.fillColor('#64748b').font('Helvetica').fontSize(4.8);
      const tcText = 
        "1. This card is non-transferable and remains the property of the company.\n" +
        "2. Any unauthorized use or duplication of this card is strictly prohibited.\n" +
        "3. If found, please return to the company office address immediately.";
      doc.text(tcText, 8, 26, { align: 'left', width: cardWidth - 16, lineGap: 1.5 });

      // Contact Details Block
      const backInfoY = 64;
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(5.5);
      doc.text(`Email: ${email}`, 8, backInfoY, { align: 'center', width: cardWidth - 16 });
      doc.text(`Phone: ${phone}`, 8, backInfoY + 8, { align: 'center', width: cardWidth - 16 });

      // Barcode representing the ID
      const barcodeWidth = 90;
      const barcodeHeight = 22;
      const barcodeX = (cardWidth - barcodeWidth) / 2;
      const barcodeY = backInfoY + 22;
      drawBarcode(doc, barcodeX, barcodeY, barcodeWidth, barcodeHeight, idNumber);

      // Print numeric ID under barcode
      doc.fillColor('#475569').font('Helvetica').fontSize(5).text(idNumber, 0, barcodeY + barcodeHeight + 3, { align: 'center', width: cardWidth });

      // Authority Signature / Seal line
      const sigY = cardHeight - 34;
      doc.moveTo(25, sigY).lineTo(cardWidth - 25, sigY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      doc.fillColor('#64748b').font('Helvetica').fontSize(5).text('Authorized Signatory', 0, sigY + 2, { align: 'center', width: cardWidth });

    } else {
      // ── Horizontal Back Side Layout ──
      
      // Title on the Left, details on the Right or vice versa
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7.5).text('TERMS & CONDITIONS', 8, 14);
      
      // Instruction terms
      doc.fillColor('#64748b').font('Helvetica').fontSize(4.8);
      const tcText = 
        "• Non-transferable & property of the issuing organization.\n" +
        "• Unauthorized use is punishable.\n" +
        "• If found, return to the office address.";
      doc.text(tcText, 8, 24, { align: 'left', width: cardWidth / 2 + 10, lineGap: 1 });

      // Contact details
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(5.2);
      doc.text(`Email: ${email}`, 8, 64, { width: cardWidth / 2 + 10 });
      doc.text(`Phone: ${phone}`, 8, 72, { width: cardWidth / 2 + 10 });

      // Right Column: Barcode & Signature
      const rightX = cardWidth / 2 + 24;

      // Barcode
      const barcodeWidth = 80;
      const barcodeHeight = 18;
      const barcodeY = 16;
      drawBarcode(doc, rightX, barcodeY, barcodeWidth, barcodeHeight, idNumber);
      doc.fillColor('#475569').font('Helvetica').fontSize(5.2).text(idNumber, rightX, barcodeY + barcodeHeight + 2, { align: 'center', width: barcodeWidth });

      // Signature line
      const sigY = cardHeight - 28;
      doc.moveTo(rightX, sigY).lineTo(cardWidth - 12, sigY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      doc.fillColor('#64748b').font('Helvetica').fontSize(4.8).text('Authorized Signatory', rightX, sigY + 2, { align: 'center', width: barcodeWidth });
    }

    doc.end();

    const pdfBytes = await pdfPromise;

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ID_Card_${idNumber}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (err: any) {
    console.error('[ID Card Generator] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
