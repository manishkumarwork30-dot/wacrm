import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

/**
 * Generates a personalized PDF document for the qualified lead.
 * It loads a template PDF from the public folder and draws text on it.
 */
export async function generateCongratulationsDoc(name: string, location: string): Promise<Uint8Array> {
  // Path to your blank template
  const templatePath = path.join(process.cwd(), 'public', 'approval_template.pdf');
  
  let existingPdfBytes;
  try {
    existingPdfBytes = await fs.readFile(templatePath);
  } catch (err) {
    throw new Error('Approval template PDF not found. Please place your template at public/approval_template.pdf');
  }

  // Load the existing PDF template
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
  // Get the first page of the document
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // Draw the name and location.
  // IMPORTANT: The exact X and Y coordinates will need to be adjusted to match where the blank spaces are on your specific template.
  // In pdf-lib, (0,0) is the bottom-left corner of the page.
  
  firstPage.drawText(`Mr. ${name}`, {
    x: 100, // <-- Adjust X coordinate as needed
    y: 650, // <-- Adjust Y coordinate as needed
    size: 14,
    color: rgb(0, 0, 0),
  });

  firstPage.drawText(`District: ${location}`, {
    x: 100, // <-- Adjust X coordinate as needed
    y: 630, // <-- Adjust Y coordinate as needed
    size: 14,
    color: rgb(0, 0, 0),
  });

  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
