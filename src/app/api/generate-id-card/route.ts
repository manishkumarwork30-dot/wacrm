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
  const cleanCode = (code || '761788').toUpperCase().replace(/[^A-Z0-9]/g, '');
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
      name = 'ANJU',
      designation = 'SERVICE PROVIDER',
      idNumber = '761788',
      aadharNo = 'XXXX XXXX 0638',
      email = 'HTLLIMITED.COM',
      phone = '9990035764',
      validUpto = '31 MARCH 2031',
      companyName = 'HTL NETWORK',
      logoUrl = 'https://htlnetwork.com/assets/images/logo.png',
      photoBase64 = '', // Base64 uploaded photo
      themeColor = '#113f67', // Dark Blue from card screenshot
      orientation = 'vertical' // vertical or horizontal
    } = data;

    // Mask Aadhaar to only show last 4 digits
    const cleanAadhar = (aadharNo || '').replace(/\s/g, '');
    const last4Digits = cleanAadhar.length >= 4 
      ? cleanAadhar.substring(cleanAadhar.length - 4) 
      : '0638';
    const displayAadhar = `AADHAR NO - XXXX XXXX ${last4Digits}`;

    // Dimensions: Standard CR-80 card size
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
    doc.rect(0, 0, cardWidth, cardHeight).strokeColor('#f1f5f9').lineWidth(1.5).stroke();

    if (orientation === 'vertical') {
      // ── Vertical Front Side Layout (Matches Screenshot Exactly) ──
      
      // Top Left Logo - Made BIG
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 8, 8, { width: 44, height: 20 });
        } catch {
          doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7).text('HTL', 8, 8);
        }
      }

      // "HTL NETWORK" text centered - Font size increased & bold weight emphasized
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(11)
         .text(companyName.toUpperCase(), 0, 30, { align: 'center', width: cardWidth });

      // Profile Photo Frame
      const photoSize = 54;
      const photoX = (cardWidth - photoSize) / 2;
      const photoY = 44; // Adjusted due to larger logo/header spacing

      if (photoBuffer) {
        try {
          doc.save();
          doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).clip();
          doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize });
          doc.restore();
        } catch {
          doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).fillColor('#cbd5e1').fill();
          doc.fillColor('#475569').font('Helvetica-Bold').fontSize(14).text(name.charAt(0).toUpperCase(), photoX, photoY + 18, { align: 'center', width: photoSize });
        }
      } else {
        doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).fillColor('#cbd5e1').fill();
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(14).text(name.charAt(0).toUpperCase(), photoX, photoY + 18, { align: 'center', width: photoSize });
      }

      // Rounded rect border on top
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).strokeColor(themeColor).lineWidth(2.5).stroke();

      // Agent Name (Bold, Blue, Uppercase)
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(8.5)
         .text(name.toUpperCase(), 0, 102, { align: 'center', width: cardWidth });

      // Aadhar No (Bold, Black, Uppercase)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(6)
         .text(displayAadhar, 0, 112, { align: 'center', width: cardWidth });

      // Designation (Bold, Blue, Uppercase)
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7.5)
         .text(designation.toUpperCase(), 0, 120, { align: 'center', width: cardWidth });

      // Info Fields (Bold, Black)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(6);
      doc.text(`ID NO :- ${idNumber}`, 0, 130, { align: 'center', width: cardWidth });
      doc.text(`PHONE NO :- ${phone}`, 0, 138, { align: 'center', width: cardWidth });
      doc.text(`E-MAIL :- ${email.toUpperCase()}`, 0, 146, { align: 'center', width: cardWidth });

      // Barcode
      const barcodeWidth = 120;
      const barcodeHeight = 18;
      const barcodeX = (cardWidth - barcodeWidth) / 2;
      const barcodeY = 155;
      drawBarcode(doc, barcodeX, barcodeY, barcodeWidth, barcodeHeight, idNumber);

      // Validity (Bold, Black)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(6)
         .text(`VALID UPTO :- ${validUpto.toUpperCase()}`, 0, 176, { align: 'center', width: cardWidth });

      // Double-layered Curved Wave Footer at the bottom (Matches image layering)
      doc.save();
      
      // 1. Light Blue wave background (highest)
      doc.fillColor('#3b82f6');
      doc.moveTo(0, cardHeight - 22)
         .quadraticCurveTo(cardWidth * 0.5, cardHeight - 34, cardWidth, cardHeight - 16)
         .lineTo(cardWidth, cardHeight)
         .lineTo(0, cardHeight)
         .closePath()
         .fill();

      // 2. Dark Blue wave foreground (lowest, overlapping bottom part)
      doc.fillColor('#1e40af');
      doc.moveTo(0, cardHeight - 14)
         .quadraticCurveTo(cardWidth * 0.5, cardHeight - 24, cardWidth, cardHeight - 10)
         .lineTo(cardWidth, cardHeight)
         .lineTo(0, cardHeight)
         .closePath()
         .fill();
         
      doc.restore();

    } else {
      // ── Horizontal Front Side Layout ──
      
      // Top Left Logo - Made BIG
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 8, 8, { width: 44, height: 20 });
        } catch {
          doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7).text('HTL', 8, 8);
        }
      }

      // "HTL NETWORK" text centered
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(11)
         .text(companyName.toUpperCase(), 60, 12, { align: 'left', width: cardWidth - 68 });

      // Profile Photo on the Left
      const photoSize = 54;
      const photoX = 12;
      const photoY = 38;

      if (photoBuffer) {
        try {
          doc.save();
          doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).clip();
          doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize });
          doc.restore();
        } catch {
          doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).fillColor('#cbd5e1').fill();
          doc.fillColor('#475569').font('Helvetica-Bold').fontSize(14).text(name.charAt(0).toUpperCase(), photoX, photoY + 18, { align: 'center', width: photoSize });
        }
      } else {
        doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).fillColor('#cbd5e1').fill();
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(14).text(name.charAt(0).toUpperCase(), photoX, photoY + 18, { align: 'center', width: photoSize });
      }

      doc.roundedRect(photoX, photoY, photoSize, photoSize, 6).strokeColor(themeColor).lineWidth(2.5).stroke();

      // Details on the Right
      const rightContentX = photoX + photoSize + 12;
      const contentY = 36;

      // Agent Name (Bold, Blue, Uppercase)
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(9)
         .text(name.toUpperCase(), rightContentX, contentY, { width: cardWidth - rightContentX - 8 });

      // Aadhar No (Bold, Black, Uppercase)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(5.5)
         .text(displayAadhar, rightContentX, contentY + 11, { width: cardWidth - rightContentX - 8 });

      // Designation (Bold, Blue, Uppercase)
      doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(7.5)
         .text(designation.toUpperCase(), rightContentX, contentY + 19, { width: cardWidth - rightContentX - 8 });

      // Info Fields
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(5.5);
      doc.text(`ID NO :- ${idNumber}`, rightContentX, contentY + 29);
      doc.text(`PHONE NO :- ${phone}`, rightContentX, contentY + 37);
      doc.text(`E-MAIL :- ${email.toUpperCase()}`, rightContentX, contentY + 45);

      // Barcode
      const barcodeWidth = 100;
      const barcodeHeight = 15;
      const barcodeX = 12;
      const barcodeY = 102;
      drawBarcode(doc, barcodeX, barcodeY, barcodeWidth, barcodeHeight, idNumber);

      // Validity (Bold, Black)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(5.5)
         .text(`VALID UPTO :- ${validUpto.toUpperCase()}`, 12, 122);

      // Curved Blue Wave Footer at the bottom right corner
      doc.save();
      // Light blue wave (top)
      doc.fillColor('#3b82f6');
      doc.moveTo(cardWidth - 55, cardHeight)
         .quadraticCurveTo(cardWidth - 28, cardHeight - 24, cardWidth, cardHeight - 15)
         .lineTo(cardWidth, cardHeight)
         .closePath()
         .fill();

      // Dark blue wave (bottom)
      doc.fillColor('#1e40af');
      doc.moveTo(cardWidth - 45, cardHeight)
         .quadraticCurveTo(cardWidth - 20, cardHeight - 15, cardWidth, cardHeight - 8)
         .lineTo(cardWidth, cardHeight)
         .closePath()
         .fill();
      doc.restore();
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
