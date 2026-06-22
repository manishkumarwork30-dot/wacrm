// src/bin/format-whatsapp.ts


import { formatWhatsAppText, formatEntry } from '../lib/whatsapp/messageFormatter';
import * as fs from 'fs';
import * as path from 'path';

const [, , inputFile, outFile = '-'] = process.argv;

if (!inputFile) {
  console.error('Usage: format-whatsapp <input.txt> [output.txt]');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputFile);
const raw = fs.readFileSync(inputPath, 'utf8');
const entries = formatWhatsAppText(raw);

if (entries.length === 0) {
  console.error('No entries parsed from the input.');
  process.exit(2);
}

const formattedLines = entries.map(e => formatEntry(e)).join('\n\n');

if (outFile === '-') {
  process.stdout.write(formattedLines + '\n');
} else {
  const outPath = path.resolve(process.cwd(), outFile);
  fs.writeFileSync(outPath, formattedLines + '\n', 'utf8');
}
