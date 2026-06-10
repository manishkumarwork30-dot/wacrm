const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs/promises');
const path = require('path');

async function createDummyTemplate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  
  page.drawText('Approval Template Placeholder', {
    x: 50,
    y: 750,
    size: 24,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(path.join(__dirname, 'public', 'approval_template.pdf'), pdfBytes);
  console.log('Dummy template created successfully.');
}

createDummyTemplate().catch(console.error);
