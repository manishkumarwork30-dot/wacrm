// src/bin/format-whatsapp.ts

#!/usr/bin/env node
import { formatWhatsAppText } from '../lib/whatsapp/messageFormatter';
import * as fs from 'fs';
import * as path from 'path';

const [, , inputFile, outFile = '-', format = 'json'] = process.argv;

if (!inputFile) {
  console.error('Usage: format-whatsapp <input.txt> [output.[json|csv]] [json|csv]');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputFile);
const raw = fs.readFileSync(inputPath, 'utf8');
const entries = formatWhatsAppText(raw);

if (format === 'csv') {
  const header = [
    'name',
    'relation',
    'village',
    'postOffice',
    'tehsil',
    'district',
    'pincode',
    'state',
    'phone',
    'applicantName',
    'stateCode',
  ];
  const csvLines = [header.join(',')];
  for (const e of entries) {
    const line = header
      .map(h => `"${(e as any)[h] ?? ''}"`)
      .join(',');
    csvLines.push(line);
  }
  const csv = csvLines.join('\n');
  if (outFile === '-') process.stdout.write(csv);
  else fs.writeFileSync(path.resolve(process.cwd(), outFile), csv);
} else {
  const json = JSON.stringify(entries, null, 2);
  if (outFile === '-') process.stdout.write(json);
  else fs.writeFileSync(path.resolve(process.cwd(), outFile), json);
}
