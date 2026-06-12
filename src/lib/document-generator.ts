import PDFDocument from 'pdfkit';

// ── Module-level caches (reused across warm serverless containers) ────────────

let _fontCache: {
  regular: Buffer | null;
  bold: Buffer | null;
  italic: Buffer | null;
} | null = null;

let _assetCache: {
  logo: Buffer | null;
  qr: Buffer | null;
  signature: Buffer | null;
  stamp: Buffer | null;
  watermark: Buffer | null;   // Survey-Of-India.png  – shown on every page
  hdrP2P3: Buffer | null;     // Picture3.png         – page 2 & 3 header
  hdrP4: Buffer | null;       // page 4 header image
  p3img1: Buffer | null;      // Picture7.png         – page 3 content
  p3img2: Buffer | null;      // Picture8.png         – page 3 content
  p4img1: Buffer | null;      // Picture9.png         – page 4 content
  p4img2: Buffer | null;      // Picture10.png        – page 4 content
} | null = null;

const fetchBuffer = async (url: string): Promise<Buffer | null> => {
  try {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(`[PDF] Failed to fetch ${url}:`, e);
  }
  return null;
};

const getFonts = async () => {
  if (_fontCache) return _fontCache;
  const base =
    'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/';
  const [regular, bold, italic] = await Promise.all([
    fetchBuffer(base + 'Roboto-Regular.ttf'),
    fetchBuffer(base + 'Roboto-Bold.ttf'),
    fetchBuffer(base + 'Roboto-Italic.ttf'),
  ]);
  _fontCache = { regular, bold, italic };
  return _fontCache;
};

const getAssets = async () => {
  if (_assetCache) return _assetCache;
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
  _assetCache = { logo, qr, signature, stamp, watermark, hdrP2P3, hdrP4, p3img1, p3img2, p4img1, p4img2 };
  return _assetCache;
};

/** Draw the Survey-of-India watermark centred on the current page (every page). */
function drawWatermark(doc: PDFKit.PDFDocument, buf: Buffer | null) {
  if (!buf) return;
  doc.save();
  try {
    doc.opacity(0.12); // Slightly higher opacity for full-page watermark
    // Full page A4 (595x842)
    doc.image(buf, 0, 0, { width: 595, height: 842 });
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
export async function generateCongratulationsDoc(data: any): Promise<Uint8Array> {
  const [fonts, assets] = await Promise.all([getFonts(), getAssets()]);

  return new Promise((resolve, reject) => {
    try {
      const {
        name, location, mobile_no, state, pin_code, land_size, ownership, date,
      } = data;

      const finalName      = name      || 'Applicant';
      const finalLocation  = location  || 'Unknown District';
      const finalState     = state     || 'Unknown State';
      const finalLandSize  = land_size || '225 sqft';
      const finalOwnership = ownership || data.is_owned || 'N/A';

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(new Uint8Array(Buffer.concat(buffers))));

      // Register CDN fonts; fall back to built-in Helvetica when unavailable
      if (fonts.regular) doc.registerFont('R', fonts.regular);
      if (fonts.bold)    doc.registerFont('B', fonts.bold);
      if (fonts.italic)  doc.registerFont('I', fonts.italic);

      const R = fonts.regular ? 'R' : 'Helvetica';
      const B = fonts.bold    ? 'B' : 'Helvetica-Bold';
      const I = fonts.italic  ? 'I' : 'Helvetica-Oblique';

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 1 – APPROVAL LETTER
      // ═══════════════════════════════════════════════════════════════════════

      // Watermark (drawn first so content renders on top)
      drawWatermark(doc, assets.watermark);

      // Top-left Logo
      if (assets.logo) {
        try { doc.image(assets.logo, 40, 20, { width: 150, height: 150 }); }
        catch { _drawFallbackTower(doc, 40, 20); }
      } else {
        _drawFallbackTower(doc, 40, 20);
      }

      // Company title on the right of the logo
      doc.save();
      doc.fillColor('#1e3a8a'); // Professional dark blue
      doc.font(B).fontSize(42).text('HTL NETWORK', 200, 60, { characterSpacing: 2 });
      doc.font(R).fontSize(12).fillColor('#475569').text('Telecommunication Infrastructure Solutions', 205, 110, { characterSpacing: 1 });
      doc.restore();

      // Header divider
      doc.moveTo(40, 180).lineTo(555, 180).strokeColor('#2563eb').lineWidth(2).stroke();
      doc.moveTo(40, 184).lineTo(555, 184).strokeColor('#93c5fd').lineWidth(1).stroke();
      
      doc.y = 200;

      // APPROVAL LETTER title
      doc.font(B).fontSize(16).fillColor('#1e3a8a')
         .text('LETTER OF APPROVAL', { align: 'center', underline: true });
      doc.moveDown(1.5);

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

      doc.font(R).fontSize(10).fillColor('black').text(`Date : ${formattedDate}`);
      doc.moveDown(1.2);

      // Salutation
      doc.font(B).fontSize(10).text('DEAR PROSPECTIVE LANDLORD');
      doc.moveDown(0.8);
      doc.font(B).fontSize(11).text(`Mr. ${finalName}`);
      doc.font(B).fontSize(11).text(`District ${finalLocation}`);
      doc.moveDown(1.2);

      // Body paragraphs
      doc.font(R).fontSize(9.5).fillColor('black');
      doc.text(
        `HTL NETWORK PVT. LTD. is looking for tower location across different state in India. We are very glad to inform that VI 5G NETWORK has agreed to install its NETWORK Tower with the given referenceDDD/KG/1044J/05G on the land referred by you. On the basis of your documents and suitability of your land space, the issue to be held. The agreement period is for 20 years and can be extend for further 15 years, if both parties agreed. In case of expanding of tower maturity period, the term and condition will be according to policies of the company in the financial year and laws of the government. After issued of your License certificate, our company will provide you a sum of Rs. 70 lacs as advance and rent of first month. During the agreement period the sum of Rs.60,000/-per month will be allocated for as rent with an increment of 10% per year (Out of rent allotted, 30,000 will be credited to your account and rest 30,000 will be deducted as EMI on 70 lacs Advance so that amount will be recovered within 20 years agreement\'s time period) and Rs. 22000/- as salary for security Guard. All the rule and regulation will be governed by companies ACT 1956 in case of any legal procedure.`,
        { align: 'justify', lineGap: 2.2 }
      );
      doc.moveDown(1.0);
      doc.text(
        `You need to deposit Agreement fee of Rs.2550/-in our ADVOCATE Bank account through NEFT/RTGS/IMPS/TRANSFER. That will be refunded to you along with your first payment given by the company with 2% interest on it.`,
        { align: 'justify', lineGap: 2.2 }
      );
      doc.moveDown(1.0);
      doc.text(
        `You should fulfill the minimum requirement of land referred by you for installation of tower that is 225 sq.ft land must be owned by the applicant and lease land will not be considered.`,
        { align: 'justify', lineGap: 2.2 }
      );
      doc.moveDown(1.0);
      doc.text(
        `Once the deal begins and the tower gets installed on your land, the scheme cannot be terminated before maturity period of 20 years. Delay may terminate the deal and the whole issue gets condemned.`,
        { align: 'justify', lineGap: 2.2 }
      );
      doc.moveDown(1.8);

      // Signature / Stamp / QR row
      const signY = doc.y;

      doc.font(B).fontSize(10).fillColor('black').text('Authorized Signatory', 50, signY);

      if (assets.signature) {
        try { doc.image(assets.signature, 50, signY + 15, { width: 90, height: 40 }); }
        catch { _drawFallbackSignature(doc, 50, signY + 15); }
      } else {
        _drawFallbackSignature(doc, 50, signY + 15);
      }

      if (assets.stamp) {
        try { doc.image(assets.stamp, 50, signY + 60, { width: 80, height: 80 }); }
        catch { _drawFallbackStamp(doc, 50, signY + 60); }
      } else {
        _drawFallbackStamp(doc, 50, signY + 60);
      }

      const qrX = 420;
      doc.font(B).fontSize(7.5).fillColor('black')
         .text('Please scan the bar code and check Approval', qrX - 10, signY + 5, { width: 100, align: 'center' });

      if (assets.qr) {
        try { doc.image(assets.qr, qrX, signY + 25, { width: 80, height: 80 }); }
        catch { _drawFallbackQR(doc, qrX, signY + 25); }
      } else {
        _drawFallbackQR(doc, qrX, signY + 25);
      }

      // Footer
      doc.save();
      doc.moveTo(50, 740).lineTo(545, 740).strokeColor('black').lineWidth(1.5).stroke();
      doc.font(B).fontSize(8).fillColor('black').text(
        'HTL NETWORK PVT. LTD. B/67, MALLESWARAM ROAD, 4th PHASE, MALLESWARAM INDUSTRIAL AREA, BANGALORE - 560003 INDIA',
        50, 748, { align: 'center', width: 495 }
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
      doc.fillColor('blue').fontSize(14).text('LOCATION - ID - VI / 5G 0001', 50, p2ContentY + 20);

      doc.moveDown(1.5);
      doc.fillColor('black').fontSize(10).font(R).text(
        'THE SURVEY DEPARTMENT OF INDIA CONDUCTED SURVEY FOR THE TOWER INSTALLATION SURVEY REPORT IS POSITIVE WITH THE LAND PROPOSED BY YOU NOW VI 5G NETWORK HAS BEEN ALLOWED FOR FURTHER PROCESS NOW VI 5G NETWORK IS ALLOWED TO INSTALL TOWER AT GIVEN ABOVE ADDRESS THE SURVEY REPORT IS LIMITED AND CONFIDENTIAL.',
        50, doc.y, { align: 'justify', lineGap: 2 }
      );
      doc.moveDown(1.5);

      // Survey table
      const tTop = doc.y;
      const colW  = [120, 150, 100, 125];
      const cols  = [50, 170, 320, 420];

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
      const p3y  = doc.y + 10;

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
      const p4y    = doc.y + 10;

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
  (doc as any).arc(25, 10, 8,  Math.PI * 1.25, Math.PI * 1.75, false); doc.stroke();
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
    [28,4],[32,4],[40,4],[44,4],[28,8],[36,8],[48,8],[28,12],[32,12],[40,12],[44,12],
    [4,28],[8,28],[16,28],[24,28],[36,28],[44,28],[56,28],[68,28],
    [12,32],[20,32],[28,32],[40,32],[48,32],[60,32],
    [4,36],[16,36],[24,36],[32,36],[48,36],[56,36],[64,36],
    [8,40],[28,40],[36,40],[44,40],[60,40],
    [56,48],[60,48],[68,48],[56,56],[64,56],[72,56],[60,60],[68,60],[56,68],[64,68],[72,68],
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
