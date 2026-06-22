import PDFDocument from 'pdfkit';

// ── Module-level caches (reused across warm serverless containers) ────────────

let _fontPromise: Promise<{
  regular: Buffer | null;
  bold: Buffer | null;
  italic: Buffer | null;
}> | null = null;

let _assetPromise: Promise<{
  logo: Buffer | null;
  qr: Buffer | null;
  signature: Buffer | null;
  stamp: Buffer | null;
  watermark: Buffer | null;
  hdrP2P3: Buffer | null;
  hdrP4: Buffer | null;
  p3img1: Buffer | null;
  p3img2: Buffer | null;
  p4img1: Buffer | null;
  p4img2: Buffer | null;
}> | null = null;

const fetchBuffer = async (url: string): Promise<Buffer | null> => {
  try {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(`[PDF] Failed to fetch ${url}:`, e);
  }
  return null;
};

export const getFonts = () => {
  if (!_fontPromise) {
    _fontPromise = (async () => {
      const base =
        'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/';
      const [regular, bold, italic] = await Promise.all([
        fetchBuffer(base + 'Roboto-Regular.ttf'),
        fetchBuffer(base + 'Roboto-Bold.ttf'),
        fetchBuffer(base + 'Roboto-Italic.ttf'),
      ]);
      return { regular, bold, italic };
    })();
  }
  return _fontPromise;
};

export const getAssets = () => {
  if (!_assetPromise) {
    _assetPromise = (async () => {
      const [
        logo, qr, signature, stamp,
        watermark, hdrP2P3, hdrP4,
        p3img1, p3img2, p4img1, p4img2,
      ] = await Promise.all([
        fetchBuffer('https://htlnetwork.com/assets/images/logo.png'),
        fetchBuffer('https://i.ibb.co/Hfydd1wF/qrcode-361081771-9939f3ef116f18267f831b63d7b2e76d.png'),
        fetchBuffer('https://i.ibb.co/Fqj8CGm3/signature.png'),
        fetchBuffer('https://i.ibb.co/v6cQ2rDC/approval-image.png'),
        fetchBuffer('https://i.ibb.co/PZKK8CZ4/Survey-Of-India.png'),  // watermark – every page
        fetchBuffer('https://i.ibb.co/hJpwPfZd/Picture3.png'),          // page 2 & 3 header
        fetchBuffer('https://i.ibb.co/hJpwPfZd/Picture3.png'),          // page 4 header (reuse verified image)
        fetchBuffer('https://i.ibb.co/b0wmpr0/Picture7.png'),
        fetchBuffer('https://i.ibb.co/CpYqYxP0/Picture8.png'),
        fetchBuffer('https://i.ibb.co/Xrfg6kYb/Picture9.png'),
        fetchBuffer('https://i.ibb.co/YBkM6RZq/Picture10.png'),
      ]);
      return { logo, qr, signature, stamp, watermark, hdrP2P3, hdrP4, p3img1, p3img2, p4img1, p4img2 };
    })();
  }
  return _assetPromise;
};

/** Draw the Survey-of-India watermark centred on the current page (every page). */
function drawWatermark(doc: PDFKit.PDFDocument, buf: Buffer | null) {
  if (!buf) return;
  doc.save();
  try {
    doc.opacity(0.15);
    // Make watermark very big and centered vertically and horizontally
    const watermarkSize = 450;
    const x = (595.28 - watermarkSize) / 2;
    const y = (595.28 - watermarkSize) / 2;
    doc.image(buf, x, y, { width: watermarkSize });
  } catch { /* skip on image error */ }
  doc.restore();
}

/**
 * Draw a page header image spanning the full content width.
 * Falls back to a plain text box when the image is unavailable.
 */
function drawPageHeader(
  doc: PDFKit.PDFDocument,
  buf: Buffer | null,
  fallbackText: string,
  B: string,
) {
  if (buf) {
    try {
      doc.image(buf, 50, 30, { width: 495, height: 70 });
      doc.y = 110;
      return;
    } catch { /* fall through to text box */ }
  }
  doc.rect(50, 30, 495, 60).stroke();
  doc.fontSize(12).font(B).text(fallbackText, 60, 55, { align: 'center', width: 475 });
  doc.y = 100;
}

/**
 * Generates a personalized 4-page PDF document for the qualified lead.
 * • Page 1 : Approval Letter (logo header, full body, signature, QR)
 * • Page 2 : Survey Report  (Picture3 header, survey content, applicant details)
 * • Page 3 : Coverage maps  (Picture3 header, Picture7 + Picture8)
 * • Page 4 : Coverage maps  (Picture4 header, Picture9 + Picture10)
 * Fonts fetched from CDN; built-in Helvetica used as local fallback.
 * Survey-of-India watermark appears on every page.
 */
export const DEFAULT_DOC_CONFIG = {
  companyName: 'HTL NETWORK',
  companyAddress: 'HTL NETWORK PVT. LTD. B/67, MALLESWARAM ROAD, 4th PHASE, MALLESWARAM INDUSTRIAL AREA, BANGALORE - 560003 INDIA',
  approvalLetterTitle: 'LETTER OF APPROVAL',
  paragraph1: `HTL NETWORK PVT. LTD. is looking for tower location across different state in India. We are very glad to inform that VI 5G NETWORK has agreed to install its NETWORK Tower with the given referenceDDD/KG/1044J/05G on the land referred by you. On the basis of your documents and suitability of your land space, the issue to be held. The agreement period is for 20 years and can be extend for further 15 years, if both parties agreed. In case of expanding of tower maturity period, the term and condition will be according to policies of the company in the financial year and laws of the government. After issued of your License certificate, our company will provide you a sum of Rs. 70 lacs as advance and rent of first month. During the agreement period the sum of Rs.60,000/-per month will be allocated for as rent with an increment of 10% per year (Out of rent allotted, 30,000 will be credited to your account and rest 30,000 will be deducted as EMI on 70 lacs Advance so that amount will be recovered within 20 years agreement\'s time period) and Rs. 22000/- as salary for security Guard. All the rule and regulation will be governed by companies ACT 1956 in case of any legal procedure.`,
  paragraph2: `You need to deposit Agreement fee of Rs.2550/-in our ADVOCATE Bank account through NEFT/RTGS/IMPS/TRANSFER. That will be refunded to you along with your first payment given by the company with 2% interest on it.`,
  paragraph3: `You should fulfill the minimum requirement of land referred by you for installation of tower that is 225 sq.ft land must be owned by the applicant and lease land will not be considered.`,
  paragraph4: `Once the deal begins and the tower gets installed on your land, the scheme cannot be terminated before maturity period of 20 years. Delay may terminate the deal and the whole issue gets condemned.`,

  advanceAmount: 'Rs. 70 lacs',
  monthlyRent: 'Rs.60,000/-',
  guardSalary: 'Rs. 22000/-',
  agreementFee: 'Rs.2550/-',
  interestRate: '2%',
  agreementPeriod: '20 years',
  incrementPercent: '10%',

  surveyLocationId: 'LOCATION - ID - VI / 5G 0001',
  surveyReportText: 'THE SURVEY DEPARTMENT OF INDIA CONDUCTED SURVEY FOR THE TOWER INSTALLATION SURVEY REPORT IS POSITIVE WITH THE LAND PROPOSED BY YOU NOW VI 5G NETWORK HAS BEEN ALLOWED FOR FURTHER PROCESS NOW VI 5G NETWORK IS ALLOWED TO INSTALL TOWER AT GIVEN ABOVE ADDRESS THE SURVEY REPORT IS LIMITED AND CONFIDENTIAL.',

  logoUrl: 'https://htlnetwork.com/assets/images/logo.png',
  qrUrl: 'https://i.ibb.co/Hfydd1wF/qrcode-361081771-9939f3ef116f18267f831b63d7b2e76d.png',
  signatureUrl: 'https://i.ibb.co/Fqj8CGm3/signature.png',
  stampUrl: 'https://i.ibb.co/v6cQ2rDC/approval-image.png',
  watermarkUrl: 'https://i.ibb.co/PZKK8CZ4/Survey-Of-India.png',
  hdrP2P3Url: 'https://i.ibb.co/hJpwPfZd/Picture3.png',
  hdrP4Url: 'https://i.ibb.co/hJpwPfZd/Picture3.png',
  p3img1Url: 'https://i.ibb.co/b0wmpr0/Picture7.png',
  p3img2Url: 'https://i.ibb.co/CpYqYxP0/Picture8.png',
  p4img1Url: 'https://i.ibb.co/Xrfg6kYb/Picture9.png',
  p4img2Url: 'https://i.ibb.co/YBkM6RZq/Picture10.png',
};

export async function getAssetsWithOverrides(customConfig?: any) {
  const defaults = await getAssets();
  if (!customConfig) return defaults;

  const overrides: any = { ...defaults };
  const keys = [
    ['logo', 'logoUrl'],
    ['qr', 'qrUrl'],
    ['signature', 'signatureUrl'],
    ['stamp', 'stampUrl'],
    ['watermark', 'watermarkUrl'],
    ['hdrP2P3', 'hdrP2P3Url'],
    ['hdrP4', 'hdrP4Url'],
    ['p3img1', 'p3img1Url'],
    ['p3img2', 'p3img2Url'],
    ['p4img1', 'p4img1Url'],
    ['p4img2', 'p4img2Url'],
  ];

  await Promise.all(
    keys.map(async ([assetKey, configKey]) => {
      const url = customConfig[configKey];
      if (url && url !== (DEFAULT_DOC_CONFIG as any)[configKey]) {
        const buf = await fetchBuffer(url);
        if (buf) {
          overrides[assetKey] = buf;
        }
      }
    })
  );

  return overrides;
}

function formatParagraph(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
  });
}

export async function generateCongratulationsDoc(data: any, customConfig?: any): Promise<Uint8Array> {
  const cfg = { ...DEFAULT_DOC_CONFIG, ...customConfig };
  const [fonts, assets] = await Promise.all([
    getFonts(),
    getAssetsWithOverrides(customConfig),
  ]);

  return new Promise((resolve, reject) => {
    try {
      const {
        name, location, mobile_no, state, pin_code, land_size, ownership, date,
      } = data;

      const finalName = name || 'Applicant';
      const finalLocation = location || 'Unknown District';
      const finalState = state || 'Unknown State';
      const finalLandSize = land_size || '225 sqft';
      const finalOwnership = ownership || data.is_owned || 'N/A';

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(new Uint8Array(Buffer.concat(buffers))));

      // Register CDN fonts; fall back to built-in Helvetica when unavailable
      if (fonts.regular) doc.registerFont('R', fonts.regular);
      if (fonts.bold) doc.registerFont('B', fonts.bold);
      if (fonts.italic) doc.registerFont('I', fonts.italic);

      const R = fonts.regular ? 'R' : 'Helvetica';
      const B = fonts.bold ? 'B' : 'Helvetica-Bold';
      const I = fonts.italic ? 'I' : 'Helvetica-Oblique';

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 1 – APPROVAL LETTER
      // ═══════════════════════════════════════════════════════════════════════

      // Watermark (drawn first so content renders on top)
      drawWatermark(doc, assets.watermark);

      // Logo Left & Company Title side-by-side (Header box)
      const headerBoxY = 15;
      if (assets.logo) {
        try {
          doc.image(assets.logo, 20, headerBoxY, { width: 130, height: 85 }); // logo height scaled to 100
        } catch {
          _drawFallbackTower(doc, 20, headerBoxY);
        }
      } else {
        _drawFallbackTower(doc, 20, headerBoxY);
      }

      // Title Text side-by-side (fontSize 72 for ~100px height. Width set to 380 so it fits side-by-side without wrapping)
      doc.save();
      doc.fillColor('#0026e6'); // Bright/vibrant blue matching mockup
      doc.font(B).fontSize(60).text('HTL NETWORK', 120, headerBoxY + 12, { // large font size matching logo height
        width: 500,
        align: 'left',
        characterSpacing: 0
      });
      doc.restore();

      // Bold blue divider line matching the mockup layout (closer to header content)
      doc.moveTo(0, 115).lineTo(660, 115).strokeColor('#2b5ce6').lineWidth(2.5).stroke();

      doc.x = 40;
      doc.y = 99; // Reduced gap below the divider line

      // APPROVAL LETTER title centered below header
      doc.save();
      doc.font(B).fontSize(18).fillColor('#0026e6')
        .text('APPROVAL LETTER', { align: 'center' });

      // Underline style (red line closer to APPROVAL LETTER text)
      const titleWidth = doc.widthOfString('APPROVAL LETTER');
      const startX = (595.28 - titleWidth) / 2;
      doc.moveTo(startX, doc.y + 1).lineTo(startX + titleWidth, doc.y + 1).strokeColor('red').lineWidth(2.5).stroke();
      doc.restore();

      doc.moveDown(0.7);

      // Date
      let formattedDate: string;
      const now = new Date();
      if (date) {
        if (typeof date === 'string') {
          formattedDate = date.includes('/')
            ? date
            : (() => {
              const p = new Date(date);
              return isNaN(p.getTime())
                ? `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
                : `${p.getDate()}/${p.getMonth() + 1}/${p.getFullYear()}`;
            })();
        } else if (date instanceof Date) {
          formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        } else {
          formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        }
      } else {
        formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      }

      doc.font(R).fontSize(13).fillColor('black').text(`Date : ${formattedDate}`, 40, doc.y);
      doc.moveDown(1.2);

      // Salutation
      doc.font(B).fontSize(14).text('DEAR PROSPECTIVE LANDLORD', 40, doc.y);
      doc.moveDown(0.8);
      doc.font(B).fontSize(16).text(`Mr. ${finalName}`, 40, doc.y);
      doc.font(B).fontSize(16).text(`District-${finalLocation}`, 40, doc.y);
      doc.moveDown(1.2);

      // Interpolation vars map
      const pVars: Record<string, string> = {
        name: finalName,
        location: finalLocation,
        mobile_no: mobile_no || 'N/A',
        state: finalState,
        pin_code: pin_code || 'N/A',
        land_size: finalLandSize,
        ownership: finalOwnership,
        date: formattedDate,
        companyName: cfg.companyName,
        approvalLetterTitle: cfg.approvalLetterTitle,
        advanceAmount: cfg.advanceAmount,
        monthlyRent: cfg.monthlyRent,
        guardSalary: cfg.guardSalary,
        agreementFee: cfg.agreementFee,
        interestRate: cfg.interestRate,
        agreementPeriod: cfg.agreementPeriod,
        incrementPercent: cfg.incrementPercent,
      };

      // Body paragraphs
      doc.font(R).fontSize(12).fillColor('black');
      doc.text(
        formatParagraph(cfg.paragraph1, pVars),
        40, doc.y, { align: 'justify', lineGap: 2.5, width: 515 }
      );
      doc.moveDown(1.0);
      doc.text(
        formatParagraph(cfg.paragraph2, pVars),
        40, doc.y, { align: 'justify', lineGap: 2.5, width: 515 }
      );

      // Signature / Stamp / QR row
      // Use fixed y-coordinate so they don't overlap text or footer
      const signY = 560;
      const leftX = 120;
      const rightX = 300;
      // Left column: Authorized Signatory text, signature image, approval stamp image stacked vertically
      doc.font(B).fontSize(12).fillColor('black').text('Authorized Signatory', leftX, signY);
      if (assets.signature) {
        try { doc.image(assets.signature, leftX, signY + 15, { width: 90, height: 40 }); }
        catch { _drawFallbackSignature(doc, leftX, signY + 15); }
      } else {
        _drawFallbackSignature(doc, leftX, signY + 15);
      }
      // Approval stamp below signature
      if (assets.stamp) {
        try { doc.image(assets.stamp, leftX, signY + 60, { width: 80, height: 80 }); }
        catch { _drawFallbackStamp(doc, leftX, signY + 60); }
      } else {
        _drawFallbackStamp(doc, leftX, signY + 60);
      }
      // Right column: QR prompt text and QR image stacked vertically
      // QR prompt text
      doc.font(B).fontSize(12).fillColor('black')
        .text('Please scan QR code', rightX, signY);
      // QR image below text
      if (assets.qr) {
        try { doc.image(assets.qr, rightX, signY + 15, { width: 100, height: 100 }); }
        catch { _drawFallbackQR(doc, rightX, signY + 15); }
      } else {
        _drawFallbackQR(doc, rightX, signY + 15);
      }

      // Footer
      doc.save();
      doc.moveTo(0, 740).lineTo(595, 740).strokeColor('black').lineWidth(1.5).stroke();
      doc.font(B).fontSize(14).fillColor('black').text(
        cfg.companyAddress,
        0, 748, { align: 'center', width: 595 }
      );
      doc.restore();

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 2 – SURVEY REPORT
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();

      drawWatermark(doc, assets.watermark);
      drawPageHeader(doc, assets.hdrP2P3, 'Department of Science & Technology | Survey of India', B);

      const p2ContentY = doc.y + 10;

      doc.fontSize(12).font(B).fillColor('black').text('DEAR, PROSPECTIVE LANDLORD', 50, p2ContentY);
      doc.fillColor('blue').fontSize(14).text(cfg.surveyLocationId, 50, p2ContentY + 20);

      doc.moveDown(1.5);
      doc.fillColor('black').fontSize(10).font(R).text(
        formatParagraph(cfg.surveyReportText, pVars),
        50, doc.y, { align: 'justify', lineGap: 2 }
      );
      doc.moveDown(1.5);

      // Survey table
      const tTop = doc.y;
      const colW = [120, 150, 100, 125];
      const cols = [50, 170, 320, 420];

      // Header row
      doc.rect(50, tTop, 495, 25).stroke();
      const tHeaders = ['LAND', 'GOVERNMENT REPORT', 'GEO POSITION', 'REQUIREMENT'];
      tHeaders.forEach((h, i) =>
        doc.font(B).fontSize(9).fillColor('black').text(h, cols[i], tTop + 8, { width: colW[i], align: 'center' })
      );
      // Data row
      doc.rect(50, tTop + 25, 495, 25).stroke();
      const tData = ['APPROVED', 'CONFIRM', 'VERY GOOD', 'YES'];
      tData.forEach((d, i) =>
        doc.font(R).fontSize(9).text(d, cols[i], tTop + 33, { width: colW[i], align: 'center' })
      );
      // Vertical separators
      [170, 320, 420].forEach(x => {
        doc.moveTo(x, tTop).lineTo(x, tTop + 50).stroke();
      });

      doc.moveDown(2.5);

      doc.font(B).fontSize(12).fillColor('black')
        .text('Land Selected By Following Company', 50, doc.y, { align: 'center', underline: true, width: 495 });
      doc.moveDown(1.5);

      const landRows = [
        ['Land Requirement :', finalLandSize],
        ['Cover Range :', '20 Miles'],
        ['Capacity Of Mobile Tower :', 'According to Space & Size'],
        ['Vodafone Idea :', '5G NETWORK'],
      ];
      landRows.forEach(([label, value]) => {
        const rowY = doc.y;
        doc.font(B).fontSize(10).text(label, 100, rowY, { width: 180 });
        doc.font(R).fontSize(10).text(value, 300, rowY, { underline: true, width: 200 });
        doc.moveDown(0.9);
      });

      // Applicant details
      doc.moveDown(1);
      doc.fontSize(9).font(I).fillColor('#555')
        .text('Applicant Submitted Details:', 50, doc.y, { underline: true });
      doc.moveDown(0.5);
      doc.font(R).fillColor('black').fontSize(9);
      [
        `Name: ${finalName}`,
        `Mobile: ${mobile_no || 'N/A'}`,
        `Location: ${finalLocation}`,
        `State: ${finalState}`,
        `Pincode: ${pin_code || 'N/A'}`,
        `Land Size: ${finalLandSize}`,
        `Ownership: ${finalOwnership}`,
      ].forEach(line => { doc.text(line, 50, doc.y); doc.moveDown(0.4); });

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 3 – COVERAGE MAPS (Picture7 + Picture8)
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();

      drawWatermark(doc, assets.watermark);
      drawPageHeader(doc, assets.hdrP2P3, 'Department of Science & Technology | Survey Report Part 1', B);

      // Images centred horizontally: (595 - 400) / 2 = 97.5 → 97
      const imgX = 97;
      const p3y = doc.y + 10;

      if (assets.p3img1) {
        try {
          doc.image(assets.p3img1, imgX, p3y, { width: 400, height: 400 });
        } catch {
          _drawFallbackChart(doc, imgX, p3y, 400, 400, 'Signal Strength Graph (Simulation)', 'green');
        }
      } else {
        _drawFallbackChart(doc, imgX, p3y, 400, 400, 'Signal Strength Graph (Simulation)', 'green');
      }

      const p3y2 = p3y + 415; // 400px image + 15px gap
      if (assets.p3img2) {
        try {
          doc.image(assets.p3img2, imgX, p3y2, { width: 400, height: 400 });
        } catch {
          _drawFallbackChart(doc, imgX, p3y2, 400, 400, 'Frequency Analysis (Simulation)', 'blue');
        }
      } else {
        _drawFallbackChart(doc, imgX, p3y2, 400, 400, 'Frequency Analysis (Simulation)', 'blue');
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 4 – COVERAGE MAPS (Picture9 + Picture10)
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();

      drawWatermark(doc, assets.watermark);

      // Page 4: Draw heading image
      drawPageHeader(doc, assets.hdrP4, 'Department of Science & Technology | Survey Report Part 2', B);

      const p4imgX = 97; // centred on A4
      const p4y = doc.y + 10;

      if (assets.p4img1) {
        try {
          doc.image(assets.p4img1, p4imgX, p4y, { width: 400, height: 400 });
        } catch {
          _drawFallbackChart(doc, p4imgX, p4y, 400, 400, 'Network Coverage Spread - Part 1', 'green');
        }
      } else {
        _drawFallbackChart(doc, p4imgX, p4y, 400, 400, 'Network Coverage Spread - Part 1', 'green');
      }

      const p4y2 = p4y + 415; // 400px image + 15px gap
      if (assets.p4img2) {
        try {
          doc.image(assets.p4img2, p4imgX, p4y2, { width: 400, height: 400 });
        } catch {
          _drawFallbackChart(doc, p4imgX, p4y2, 400, 400, 'Network Coverage Spread - Part 2', 'blue');
        }
      } else {
        _drawFallbackChart(doc, p4imgX, p4y2, 400, 400, 'Network Coverage Spread - Part 2', 'blue');
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── Vector fallback helpers ───────────────────────────────────────────────────

function _drawFallbackTower(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save();
  doc.translate(x, y).lineWidth(1.5).strokeColor('#2563eb');
  doc.moveTo(15, 45).lineTo(25, 10).lineTo(35, 45).stroke();
  doc.moveTo(22, 22).lineTo(28, 22).stroke();
  doc.moveTo(19, 33).lineTo(31, 33).stroke();
  (doc as any).arc(25, 10, 8, Math.PI * 1.25, Math.PI * 1.75, false); doc.stroke();
  (doc as any).arc(25, 10, 14, Math.PI * 1.25, Math.PI * 1.75, false); doc.stroke();
  (doc as any).arc(25, 10, 20, Math.PI * 1.25, Math.PI * 1.75, false); doc.stroke();
  doc.fillColor('black').fontSize(8).text('htlnetwork', 0, 50, { width: 50, align: 'center' });
  doc.restore();
}

function _drawFallbackSignature(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save();
  doc.strokeColor('#1e3a8a').lineWidth(1.5);
  doc.moveTo(x + 5, y + 15)
    .bezierCurveTo(x + 20, y, x + 30, y + 30, x + 45, y + 10)
    .bezierCurveTo(x + 55, y, x + 60, y + 20, x + 75, y + 5)
    .stroke();
  doc.restore();
}

function _drawFallbackStamp(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save();
  doc.translate(x, y);
  doc.strokeColor('#dc2626').lineWidth(2);
  doc.circle(30, 30, 28).stroke();
  doc.circle(30, 30, 25).stroke();
  doc.fillColor('#dc2626').fontSize(7).text('APPROVED', 10, 26, { width: 40, align: 'center' });
  doc.restore();
}

function _drawFallbackQR(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save();
  doc.translate(x, y).strokeColor('black').lineWidth(1.5);
  doc.rect(0, 0, 80, 80).stroke();
  const finder = (fx: number, fy: number) => {
    doc.rect(fx, fy, 20, 20).fill('black');
    doc.rect(fx + 3, fy + 3, 14, 14).fill('white');
    doc.rect(fx + 6, fy + 6, 8, 8).fill('black');
  };
  finder(4, 4); finder(56, 4); finder(4, 56);
  doc.fill('black');
  const pts = [
    [28, 4], [32, 4], [40, 4], [44, 4], [28, 8], [36, 8], [48, 8], [28, 12], [32, 12], [40, 12], [44, 12],
    [4, 28], [8, 28], [16, 28], [24, 28], [36, 28], [44, 28], [56, 28], [68, 28],
    [12, 32], [20, 32], [28, 32], [40, 32], [48, 32], [60, 32],
    [4, 36], [16, 36], [24, 36], [32, 36], [48, 36], [56, 36], [64, 36],
    [8, 40], [28, 40], [36, 40], [44, 40], [60, 40],
    [56, 48], [60, 48], [68, 48], [56, 56], [64, 56], [72, 56], [60, 60], [68, 60], [56, 68], [64, 68], [72, 68],
  ];
  pts.forEach(([px, py]) => doc.rect(px, py, 4, 4).fill('black'));
  doc.restore();
}

function _drawFallbackChart(
  doc: PDFKit.PDFDocument,
  x: number, y: number,
  w: number, h: number,
  label: string,
  color: string,
) {
  doc.rect(x, y, w, h).fillOpacity(0.05).fill('black');
  doc.fillOpacity(1).rect(x, y, w, h).stroke();
  doc.fontSize(10).text(label, x + 10, y + 10);
  const midY = y + h - 30;
  doc.moveTo(x + 20, midY).lineTo(x + w - 20, midY).stroke();
  doc.moveTo(x + 20, midY).lineTo(x + 20, y + 20).stroke();
  doc.moveTo(x + 20, midY - 50)
    .lineTo(x + 80, midY - 100)
    .lineTo(x + 160, midY - 60)
    .lineTo(x + 280, midY - 120)
    .lineTo(x + 400, midY - 80)
    .stroke(color);
  doc.strokeColor('black');
}
