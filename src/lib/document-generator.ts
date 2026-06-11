import PDFDocument from 'pdfkit';

/**
 * Module-level font cache so each warm serverless container only fetches
 * the TTF files once (Vercel functions stay warm between invocations).
 */
let _fontCache: {
  regular: Buffer | null;
  bold: Buffer | null;
  italic: Buffer | null;
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

/**
 * Generates a personalized 4-page PDF document for the qualified lead using PDFKit.
 * Matches the requested layout for the HTL Network Approval Letter.
 * Fonts are loaded from CDN (no filesystem AFM dependency – safe on Vercel).
 */
export async function generateCongratulationsDoc(data: any): Promise<Uint8Array> {
  const logoUrl =
    'https://htlnetwork.com/assets/images/logo.png';
  const qrUrl =
    'https://i.ibb.co/Hfydd1wF/qrcode-361081771-9939f3ef116f18267f831b63d7b2e76d.png';

  const [logoBuffer, qrBuffer, fonts] = await Promise.all([
    fetchBuffer(logoUrl),
    fetchBuffer(qrUrl),
    getFonts(),
  ]);

  return new Promise((resolve, reject) => {
    try {
      const { name, location, mobile_no, state, pin_code, land_size, ownership, date } = data;
      const finalName = name || 'Applicant';
      const finalLocation = location || 'Unknown District';
      const finalState = state || 'Unknown State';
      const finalLandSize = land_size || '225 sq.ft';
      const finalOwnership = ownership || data.is_owned || 'N/A';

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(new Uint8Array(pdfData));
      });

      // Register custom TTF fonts (avoids Helvetica.afm filesystem lookup)
      if (fonts.regular) doc.registerFont('Regular', fonts.regular);
      if (fonts.bold)    doc.registerFont('Bold',    fonts.bold);
      if (fonts.italic)  doc.registerFont('Italic',  fonts.italic);

      // Helpers
      const R  = 'Regular';
      const B  = 'Bold';
      const I  = 'Italic';

      // --- PAGE 1: APPROVAL LETTER ---

      // Top-left Logo
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 45, 25, { width: 60 });
        } catch (logoErr) {
          console.error('Failed to draw logo image:', logoErr);
          _drawFallbackTower(doc);
        }
      } else {
        _drawFallbackTower(doc);
      }

      // Company Title on the right of the header
      doc.save();
      doc.fillColor('#0000FF');
      doc.font(B).fontSize(36).text('HTL NETWORK', 130, 32, { characterSpacing: 1 });
      doc.restore();

      // Divider line
      doc.moveTo(50, 90).lineTo(545, 90).strokeColor('#2563eb').lineWidth(2).stroke();
      doc.moveDown(1);

      // Background logo watermark
      doc.save();
      if (logoBuffer) {
        try {
          doc.opacity(0.1);
          doc.image(logoBuffer, 147, 280, { width: 300 });
        } catch (bgErr) {
          console.error('Failed to draw background logo:', bgErr);
        }
      }
      doc.restore();

      // Title: APPROVAL LETTER
      doc.moveDown(0.5);
      doc.font(B).fontSize(12).fillColor('#0000FF').text('APPROVAL LETTER', { align: 'center', underline: true });
      doc.moveDown(1.5);

      // Date
      let formattedDate = '6/6/2026';
      if (date) {
        if (typeof date === 'string') {
          if (date.includes('/')) {
            formattedDate = date;
          } else {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
              formattedDate = `${parsed.getDate()}/${parsed.getMonth() + 1}/${parsed.getFullYear()}`;
            }
          }
        } else if (date instanceof Date) {
          formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }
      } else {
        const now = new Date();
        formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      }
      doc.font(R).fontSize(10).fillColor('black').text(`Date :${formattedDate}`);
      doc.moveDown(1.5);

      // Salutation & Details
      doc.font(B).fontSize(10).text('DEAR PROSPECTIVE LANDLORD');
      doc.moveDown(1);
      doc.font(B).fontSize(11).text(`Mr. ${finalName}`);
      doc.font(B).fontSize(11).text(`District ${finalLocation}`);
      doc.moveDown(1.5);

      // Body Paragraphs
      doc.font(R).fontSize(9.5).fillColor('black');
      doc.text(
        `HTL NETWORK PVT. LTD. is looking for tower location across different state in India. We are very glad to inform that VI 5G NETWORK has agreed to install its NETWORK Tower with the given referenceDDD/KG/1044J/05G on the land referred by you. On the basis of your documents and suitability of your land space, the issue to be held. The agreement period is for 20 years and can be extend for further 15 years, if both parties agreed. In case of expanding of tower maturity period, the term and condition will be according to policies of the company in the financial year and laws of the government. After issued of your License certificate, our company will provide you a sum of Rs. 70 lacs as advance and rent of first month. During the agreement period the sum of Rs.60,000/-per month will be allocated for as rent with an increment of 10% per year (Out of rent allotted, 30,000 will be credited to your account and rest 30,000 will be deducted as EMI on 70 lacs Advance so that amount will be recovered within 20 years agreement\'s time period) and Rs. 22000/- as salary for security Guard. All the rule and regulation will be governed by companies ACT 1956 in case of any legal procedure.`,
        { align: 'justify', lineGap: 3 }
      );
      doc.moveDown(1.5);

      doc.text(
        `You need to deposit Agreement fee of Rs.2550/-in our ADVOCATE Bank account through NEFT/RTGS/IMPS/TRANSFER. That will be refunded to you along with your first payment given by the company with 2% interest on it.`,
        { align: 'justify', lineGap: 3 }
      );
      doc.moveDown(1.5);

      doc.text(
        `You should fulfill the minimum requirement of land referred by you for installation of tower that is 225 sq.ft land must be owned by the applicant and lease land will not be considered.`,
        { align: 'justify', lineGap: 3 }
      );
      doc.text(
        `Once the deal begins and the tower gets installed on your land, the scheme cannot be terminated before maturity period of 20 years. Delay may terminate the deal and the whole issue gets condemned.`,
        { align: 'justify', lineGap: 3 }
      );
      doc.moveDown(3);

      // Footer and signatures section
      const signY = doc.y;

      // Left: Authorized Signatory with simulated stamp & signature
      doc.font(B).fontSize(10).text('Authorized Signatory', 50, signY);

      // Drawing simulated signature path
      doc.save();
      doc.strokeColor('#1e3a8a').lineWidth(1.5);
      doc.moveTo(55, signY + 30).bezierCurveTo(70, signY + 15, 80, signY + 45, 95, signY + 25)
         .bezierCurveTo(105, signY + 15, 110, signY + 35, 125, signY + 20).stroke();
      doc.restore();

      // Approved Stamp
      doc.save();
      doc.translate(130, signY + 15);
      doc.strokeColor('#dc2626').lineWidth(2);
      doc.circle(20, 20, 22).stroke();
      doc.circle(20, 20, 19).stroke();
      doc.fillColor('#dc2626').font(B).fontSize(6).text('APPROVED', 5, 17, { width: 30, align: 'center' });
      doc.restore();

      // Right: QR Code and Scanning text
      const qrX = 420;
      doc.font(B).fontSize(9).text('Please scan the bar code and check Approval', 220, signY, { width: 190, align: 'right' });

      // Draw QR Code
      if (qrBuffer) {
        try {
          doc.image(qrBuffer, qrX, signY + 10, { width: 80, height: 80 });
        } catch (qrErr) {
          console.error('Failed to draw QR image:', qrErr);
          _drawFallbackQR(doc, qrX, signY + 10);
        }
      } else {
        _drawFallbackQR(doc, qrX, signY + 10);
      }

      // Footer
      doc.save();
      doc.moveTo(50, 740).lineTo(545, 740).strokeColor('black').lineWidth(1.5).stroke();
      doc.font(B).fontSize(8).fillColor('black').text(
        'HTL NETWORK PVT. LTD. B/67, MALLESWARAM ROAD, 4th PHASE, MALLESWARAM INDUSTRIAL AREA, BANGALORE - 560003 INDIA',
        50, 748, { align: 'center', width: 495 }
      );
      doc.restore();

      // --- PAGE 2: SURVEY REPORT ---
      doc.addPage();

      doc.rect(50, 30, 495, 60).stroke();
      doc.fontSize(12).font(B).text('Department of Science & Technology', 60, 50, { align: 'center' });
      doc.fontSize(10).font(R).text('Survey of India', 60, 65, { align: 'center' });
      doc.moveDown(4);

      doc.fontSize(12).font(B).text('DEAR, PROSPECTIVE LANDLORD', 50, 120);
      doc.fillColor('blue').fontSize(14).text('LOCATION - ID - VI / 5G 0001', 50, 140);
      doc.moveDown(2);

      doc.fillColor('black').fontSize(10).text(
        'THE SURVEY DEPARTMENT OF INDIA CONDUCTED SURVEY FOR THE TOWER INSTALLATION. SURVEY REPORT IS POSITIVE WITH THE LAND PROPOSED BY YOU NOW VI 5G NETWORK HAS BEEN ALLOWED FOR FURTHER PROCESS NOW VI 5G NETWORK IS ALLOWED TO INSTALL TOWER AT GIVEN ABOVE ADDRESS THE SURVEY REPORT IS LIMITED AND CONFIDENTIAL.',
        50, 170, { align: 'justify' }
      );
      doc.moveDown(2);

      // Table Headers
      const tableTop = 230;
      doc.rect(50, tableTop, 495, 25).stroke();
      doc.font(B).text('LAND', 50, tableTop + 8, { width: 120, align: 'center' });
      doc.text('GOVERNMENT REPORT', 170, tableTop + 8, { width: 150, align: 'center' });
      doc.text('GEO POSITION', 320, tableTop + 8, { width: 100, align: 'center' });
      doc.text('REQUIREMENT', 420, tableTop + 8, { width: 125, align: 'center' });

      // Table Row
      doc.rect(50, tableTop + 25, 495, 25).stroke();
      doc.font(R).text('APPROVED', 50, tableTop + 33, { width: 120, align: 'center' });
      doc.text('CONFIRM', 170, tableTop + 33, { width: 150, align: 'center' });
      doc.text('VERY GOOD', 320, tableTop + 33, { width: 100, align: 'center' });
      doc.text('YES', 420, tableTop + 33, { width: 125, align: 'center' });

      // Vertical lines for table
      doc.moveTo(170, tableTop).lineTo(170, tableTop + 50).stroke();
      doc.moveTo(320, tableTop).lineTo(320, tableTop + 50).stroke();
      doc.moveTo(420, tableTop).lineTo(420, tableTop + 50).stroke();

      doc.moveDown(4);

      doc.font(B).fontSize(12).text('Land Selected By Following Company', 50, 320, { align: 'center', underline: true });
      doc.moveDown(2);

      doc.text(`Land Requirement:`, 150, 360);
      doc.text(`${finalLandSize}`, 300, 360, { underline: true });

      doc.text(`Cover Range:`, 150, 390);
      doc.text(`20 Miles`, 300, 390, { underline: true });

      doc.text(`Capacity Of Mobile Tower:`, 150, 420);
      doc.text(`According to Space & Size`, 300, 420, { underline: true });

      doc.text(`Vodafone Idea:`, 150, 450);
      doc.text(`5G NETWORK`, 300, 450, { underline: true });

      doc.moveDown(4);
      doc.fontSize(10).font(I).text('Applicant Submitted Details (Chatbot Tracking):', 50, 520, { underline: true });
      doc.moveDown(1);
      doc.font(R).text(`Name: ${finalName}`, 50, 540);
      doc.text(`Mobile: ${mobile_no || 'N/A'}`, 50, 555);
      doc.text(`Location: ${finalLocation}`, 50, 570);
      doc.text(`State: ${finalState}`, 50, 585);
      doc.text(`Pincode: ${pin_code || 'N/A'}`, 50, 600);
      doc.text(`Land Size: ${finalLandSize}`, 50, 615);
      doc.text(`Ownership: ${finalOwnership}`, 50, 630);

      // --- PAGE 3: COVERAGE MAPS 1 ---
      doc.addPage();
      doc.rect(50, 30, 495, 60).stroke();
      doc.fontSize(12).font(B).text('Department of Science & Technology', 60, 50, { align: 'center' });

      doc.moveDown(4);
      doc.fontSize(14).text('Survey Signal & Frequency Report - Part 1', { align: 'center' });
      doc.moveDown(2);

      // Mock Chart 1
      doc.rect(100, 180, 400, 200).fillOpacity(0.1).fill('black');
      doc.fillOpacity(1);
      doc.rect(100, 180, 400, 200).stroke();
      doc.fontSize(10).text('Signal Strength Graph (Simulation)', 110, 190);
      doc.moveTo(120, 350).lineTo(480, 350).stroke();
      doc.moveTo(120, 350).lineTo(120, 220).stroke();
      doc.moveTo(120, 300).lineTo(180, 250).lineTo(250, 280).lineTo(350, 230).lineTo(450, 270).stroke('green');

      // Mock Chart 2
      doc.rect(100, 420, 400, 200).fillOpacity(0.1).fill('black');
      doc.fillOpacity(1);
      doc.rect(100, 420, 400, 200).stroke();
      doc.strokeColor('black');
      doc.fontSize(10).text('Frequency Analysis (Simulation)', 110, 430);
      doc.moveTo(120, 590).lineTo(480, 590).stroke();
      doc.moveTo(120, 590).lineTo(120, 460).stroke();
      doc.moveTo(120, 540).lineTo(180, 500).lineTo(250, 520).lineTo(350, 480).lineTo(450, 530).stroke('blue');
      doc.strokeColor('black');

      // --- PAGE 4: COVERAGE MAPS 2 ---
      doc.addPage();
      doc.rect(50, 30, 495, 60).stroke();
      doc.fontSize(12).font(B).text('Department of Science & Technology', 60, 50, { align: 'center' });

      doc.moveDown(4);
      doc.fontSize(14).text('Survey Signal & Frequency Report - Part 2', { align: 'center' });
      doc.moveDown(2);

      // Mock Chart 3
      doc.rect(100, 180, 400, 250).fillOpacity(0.1).fill('black');
      doc.fillOpacity(1);
      doc.rect(100, 180, 400, 250).stroke();
      doc.fontSize(10).text('Network Coverage Spread', 110, 190);
      for (let i = 0; i < 8; i++) {
        doc.moveTo(120, 220 + i * 25).lineTo(480, 220 + i * 25).stroke('grey');
        doc.moveTo(150 + i * 40, 200).lineTo(150 + i * 40, 400).stroke('grey');
      }
      doc.circle(300, 300, 40).fillOpacity(0.3).fill('green');
      doc.circle(260, 280, 60).fillOpacity(0.2).fill('yellow');
      doc.fillOpacity(1).strokeColor('black');

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── Fallback helpers ──────────────────────────────────────────────────────────

function _drawFallbackTower(doc: PDFKit.PDFDocument) {
  doc.save();
  doc.translate(45, 30);
  doc.lineWidth(1.5).strokeColor('#2563eb');
  doc.moveTo(15, 45).lineTo(25, 10).lineTo(35, 45).stroke();
  doc.moveTo(22, 22).lineTo(28, 22).stroke();
  doc.moveTo(19, 33).lineTo(31, 33).stroke();
  (doc as any).arc(25, 10, 8,  Math.PI * 1.25, Math.PI * 1.75, false); doc.stroke();
  (doc as any).arc(25, 10, 14, Math.PI * 1.25, Math.PI * 1.75, false); doc.stroke();
  (doc as any).arc(25, 10, 20, Math.PI * 1.25, Math.PI * 1.75, false); doc.stroke();
  doc.fillColor('black').fontSize(8).text('htlnetwork', 0, 50, { width: 50, align: 'center' });
  doc.restore();
}

function _drawFallbackQR(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save();
  doc.translate(x, y);
  doc.strokeColor('black').lineWidth(1.5);
  doc.rect(0, 0, 80, 80).stroke();
  const drawFinder = (fx: number, fy: number) => {
    doc.rect(fx, fy, 20, 20).fill('black');
    doc.rect(fx + 3, fy + 3, 14, 14).fill('white');
    doc.rect(fx + 6, fy + 6, 8, 8).fill('black');
  };
  drawFinder(4, 4); drawFinder(56, 4); drawFinder(4, 56);
  doc.fill('black');
  const pts = [
    [28,4],[32,4],[40,4],[44,4],[28,8],[36,8],[48,8],[28,12],[32,12],[40,12],[44,12],
    [4,28],[8,28],[16,28],[24,28],[36,28],[44,28],[56,28],[68,28],
    [12,32],[20,32],[28,32],[40,32],[48,32],[60,32],
    [4,36],[16,36],[24,36],[32,36],[48,36],[56,36],[64,36],
    [8,40],[28,40],[36,40],[44,40],[60,40],
    [56,48],[60,48],[68,48],[56,56],[64,56],[72,56],[60,60],[68,60],[56,68],[64,68],[72,68]
  ];
  pts.forEach(([px, py]) => doc.rect(px, py, 4, 4).fill('black'));
  doc.restore();
}
