import PDFDocument from 'pdfkit';

/**
 * Generates a personalized 4-page PDF document for the qualified lead using PDFKit.
 * Matches the requested layout for the HTL Network Approval Letter.
 */
export async function generateCongratulationsDoc(data: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const { name, location, mobile_no, state, pin_code, land_size, ownership } = data;
      const finalName = name || 'Applicant';
      const finalLocation = location || 'Unknown District';
      const finalState = state || 'Unknown State';
      const finalLandSize = land_size || '225 sq.ft';
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(new Uint8Array(pdfData));
      });

      // --- PAGE 1: APPROVAL LETTER ---
      
      // Header: HTL NETWORK
      doc.fontSize(28).fillColor('blue').text('HTL NETWORK', { align: 'center', underline: false });
      doc.moveDown(0.5);
      
      // Subtitle
      doc.fontSize(14).fillColor('red').text('APPROVAL LETTER', { align: 'center', underline: true });
      doc.moveDown(2);

      // Date
      const today = new Date();
      const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      doc.fontSize(10).fillColor('black').text(`Date: ${dateStr}`, { align: 'left' });
      doc.moveDown(1);

      // Salutation
      doc.fontSize(12).font('Helvetica-Bold').text('DEAR PROSPECTIVE LANDLORD');
      doc.moveDown(1);
      
      doc.font('Helvetica-Bold').text(`Mr. ${finalName}`);
      doc.text(`District: ${finalLocation}`);
      doc.moveDown(1);

      // Body Paragraphs
      doc.font('Helvetica').fontSize(10).text(
        `HTL NETWORK PVT. LTD. is looking for tower location across different state in India. We are very glad to inform that VI 5G NETWORK has agreed to install its NETWORK Tower with the given reference DDD/KG/1044J/05G on the land referred by you. On the basis of your documents and suitability of your land space, the issue to be held. The agreement period is for 20 years and can be extend for further 15 years, if both parties agreed. In case of expanding of tower maturity period, the term and condition will be according to policies of the company in the financial year and laws of the government. After issued of your License certificate, our company will provide you a sum of Rs. 70 lacs as advance and rent of first month. During the agreement period the sum of Rs.60,000/-per month will be allocated for as rent with an increment of 10% per year (Out of rent allotted, 30,000 will be credited to your account and rest 30,000 will be deducted as EMI on 70 lacs Advance so that amount will be recovered within 20 years agreement's time period) and Rs. 22000/- as salary for security Guard. All the rule and regulation will be governed by companies ACT 1956 in case of any legal procedure.`,
        { align: 'justify' }
      );
      doc.moveDown(1);

      doc.text(
        `You need to deposit Agreement fee of Rs.2550/-in our ADVOCATE Bank account through NEFT/RTGS/IMPS/TRANSFER. That will be refunded to you along with your first payment given by the company with 2% interest on it.`,
        { align: 'justify' }
      );
      doc.moveDown(1);

      doc.text(
        `You should fulfill the minimum requirement of land referred by you for installation of tower that is ${finalLandSize} land must be owned by the applicant and lease land will not be considered.\nOnce the deal begins and the tower gets installed on your land, the scheme cannot be terminated before maturity period of 20 years. Delay may terminate the deal and the whole issue gets condemned.`,
        { align: 'justify' }
      );
      doc.moveDown(4);

      // Signatures
      doc.text('Authorized Signatory', 50, doc.y);
      doc.text('Please scan the bar code and check Approval', 300, doc.y - 12);
      
      doc.moveDown(4);
      
      // Footer Page 1
      doc.rect(50, 750, 495, 1).fill('black');
      doc.font('Helvetica-Bold').fontSize(9).text(
        'HTL NETWORK PVT. LTD. B/67, MALLESWARAM ROAD, 4th PHASE, MALLESWARAM INDUSTRIAL AREA, BANGALORE - 560003 INDIA',
        50, 760, { align: 'center', width: 495 }
      );

      // --- PAGE 2: SURVEY REPORT ---
      doc.addPage();
      
      // Page 2 Header
      doc.rect(50, 30, 495, 60).stroke();
      doc.fontSize(12).font('Helvetica-Bold').text('Department of Science & Technology', 60, 50, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Survey of India', 60, 65, { align: 'center' });
      doc.moveDown(4);

      doc.fontSize(12).font('Helvetica-Bold').text('DEAR, PROSPECTIVE LANDLORD', 50, 120);
      doc.fillColor('blue').fontSize(14).text('LOCATION - ID - VI / 5G 0001', 50, 140);
      doc.moveDown(2);

      doc.fillColor('black').fontSize(10).text(
        'THE SURVEY DEPARTMENT OF INDIA CONDUCTED SURVEY FOR THE TOWER INSTALLATION. SURVEY REPORT IS POSITIVE WITH THE LAND PROPOSED BY YOU NOW VI 5G NETWORK HAS BEEN ALLOWED FOR FURTHER PROCESS NOW VI 5G NETWORK IS ALLOWED TO INSTALL TOWER AT GIVEN ABOVE ADDRESS THE SURVEY REPORT IS LIMITED AND CONFIDENTIAL.'.toUpperCase(),
        50, 170, { align: 'justify' }
      );
      doc.moveDown(2);

      // Table Headers
      const tableTop = 230;
      doc.rect(50, tableTop, 495, 25).stroke();
      doc.font('Helvetica-Bold').text('LAND', 50, tableTop + 8, { width: 120, align: 'center' });
      doc.text('GOVERNMENT REPORT', 170, tableTop + 8, { width: 150, align: 'center' });
      doc.text('GEO POSITION', 320, tableTop + 8, { width: 100, align: 'center' });
      doc.text('REQUIREMENT', 420, tableTop + 8, { width: 125, align: 'center' });
      
      // Table Row
      doc.rect(50, tableTop + 25, 495, 25).stroke();
      doc.font('Helvetica').text('APPROVED', 50, tableTop + 33, { width: 120, align: 'center' });
      doc.text('CONFIRM', 170, tableTop + 33, { width: 150, align: 'center' });
      doc.text('VERY GOOD', 320, tableTop + 33, { width: 100, align: 'center' });
      doc.text('YES', 420, tableTop + 33, { width: 125, align: 'center' });
      
      // Vertical lines for table
      doc.moveTo(170, tableTop).lineTo(170, tableTop + 50).stroke();
      doc.moveTo(320, tableTop).lineTo(320, tableTop + 50).stroke();
      doc.moveTo(420, tableTop).lineTo(420, tableTop + 50).stroke();

      doc.moveDown(4);

      doc.font('Helvetica-Bold').fontSize(12).text('Land Selected By Following Company', 50, 320, { align: 'center', underline: true });
      doc.moveDown(2);

      doc.text(`Land Requirement:`, 150, 360);
      doc.text(`${finalLandSize}`, 300, 360, { underline: true });

      doc.text(`Cover Range:`, 150, 390);
      doc.text(`20 Miles`, 300, 390, { underline: true });

      doc.text(`Capacity Of Mobile Tower:`, 150, 420);
      doc.text(`According to Space & Size`, 300, 420, { underline: true });

      doc.text(`Vodafone Idea:`, 150, 450);
      doc.text(`5G NETWORK`, 300, 450, { underline: true });
      
      // Add User Specific Chatbot Data section at bottom of Page 2 to fulfill "exvel mei bhi qutoin wise hoga ye sab approval ko fix kro"
      doc.moveDown(4);
      doc.fontSize(10).font('Helvetica-Oblique').text('Applicant Submitted Details (Chatbot Tracking):', 50, 520, { underline: true });
      doc.moveDown(1);
      doc.font('Helvetica').text(`Name: ${finalName}`, 50, 540);
      doc.text(`Mobile: ${mobile_no || 'N/A'}`, 50, 555);
      doc.text(`Location: ${finalLocation}`, 50, 570);
      doc.text(`State: ${finalState}`, 50, 585);
      doc.text(`Pincode: ${pin_code || 'N/A'}`, 50, 600);
      doc.text(`Land Size: ${finalLandSize}`, 50, 615);
      doc.text(`Ownership: ${ownership || 'N/A'}`, 50, 630);

      // --- PAGE 3: DUMMY COVERAGE MAPS 1 ---
      doc.addPage();
      doc.rect(50, 30, 495, 60).stroke();
      doc.fontSize(12).font('Helvetica-Bold').text('Department of Science & Technology', 60, 50, { align: 'center' });
      
      // Drawing some mock coverage charts so we don't need external images
      doc.moveDown(4);
      doc.fontSize(14).text('Survey Signal & Frequency Report - Part 1', { align: 'center' });
      doc.moveDown(2);
      
      // Mock Chart 1
      doc.rect(100, 180, 400, 200).fillOpacity(0.1).fill('black');
      doc.fillOpacity(1);
      doc.rect(100, 180, 400, 200).stroke();
      doc.fontSize(10).text('Signal Strength Graph (Simulation)', 110, 190);
      doc.moveTo(120, 350).lineTo(480, 350).stroke(); // X axis
      doc.moveTo(120, 350).lineTo(120, 220).stroke(); // Y axis
      doc.moveTo(120, 300).lineTo(180, 250).lineTo(250, 280).lineTo(350, 230).lineTo(450, 270).stroke('green');

      // Mock Chart 2
      doc.rect(100, 420, 400, 200).fillOpacity(0.1).fill('black');
      doc.fillOpacity(1);
      doc.rect(100, 420, 400, 200).stroke();
      doc.strokeColor('black');
      doc.fontSize(10).text('Frequency Analysis (Simulation)', 110, 430);
      doc.moveTo(120, 590).lineTo(480, 590).stroke(); // X axis
      doc.moveTo(120, 590).lineTo(120, 460).stroke(); // Y axis
      doc.moveTo(120, 540).lineTo(180, 500).lineTo(250, 520).lineTo(350, 480).lineTo(450, 530).stroke('blue');
      doc.strokeColor('black');

      // --- PAGE 4: DUMMY COVERAGE MAPS 2 ---
      doc.addPage();
      doc.rect(50, 30, 495, 60).stroke();
      doc.fontSize(12).font('Helvetica-Bold').text('Department of Science & Technology', 60, 50, { align: 'center' });
      
      doc.moveDown(4);
      doc.fontSize(14).text('Survey Signal & Frequency Report - Part 2', { align: 'center' });
      doc.moveDown(2);

      // Mock Chart 3
      doc.rect(100, 180, 400, 250).fillOpacity(0.1).fill('black');
      doc.fillOpacity(1);
      doc.rect(100, 180, 400, 250).stroke();
      doc.fontSize(10).text('Network Coverage Spread', 110, 190);
      // Draw a fake map grid
      for(let i=0; i<8; i++) {
        doc.moveTo(120, 220 + (i*25)).lineTo(480, 220 + (i*25)).stroke('grey');
        doc.moveTo(150 + (i*40), 200).lineTo(150 + (i*40), 400).stroke('grey');
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
