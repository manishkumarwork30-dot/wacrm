// src/lib/whatsapp/messageFormatter.ts

/**
 * Structured representation of a parsed WhatsApp entry.
 */
export interface FormattedEntry {
  name: string;
  relation?: string; // e.g. "S/O", "W/O"
  village?: string;
  postOffice?: string;
  tehsil?: string;
  district?: string;
  pincode?: string;
  state?: string;
  phone?: string;
  applicantName?: string;
  stateCode?: string; // two‑letter code like "PR", "RJ"
}

/**
 * Parses a raw multiline string copied from WhatsApp into an array of
 * {@link FormattedEntry}. It tolerates:
 *   • Timestamp lines that start with "[".
 *   • Sender lines that begin with a phone number.
 *   • Inconsistent label spellings (e.g. "Disst", "Distt").
 *   • Optional two‑letter state‑code lines (e.g. PR, RN) that act as a
 *     delimiter for the *next* entry.
 */
export function formatWhatsAppText(rawText: string): FormattedEntry[] {
  // 1️⃣ Strip out timestamp lines, HTL Network lines and lines that start with a phone number
  const cleaned = rawText
    .split(/\r?\n/)
    .filter(
      line =>
        !line.trim().startsWith('[') && // timestamps like "[5:00 pm, 18/6/2026]"
        !/^\+?\d{1,3}\s*\d{5,}/.test(line.trim()) && // lines that are just a phone number prefix
        !/HTL\s+Network/i.test(line) // ignore footer lines
    )
    .join('\n');

  // 2️⃣ Split on blank lines – each block should represent one person's data (or a lone state code)
  const rawBlocks = cleaned
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  const result: FormattedEntry[] = [];
  let pendingStateCode: string | null = null;

  for (const block of rawBlocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // If the block is just a two‑letter state code, remember it for the next entry
    if (lines.length === 1 && /^[A-Z]{2}$/.test(lines[0])) {
      pendingStateCode = lines[0];
      continue;
    }

    const entry: FormattedEntry = { name: '' };

    for (const line of lines) {
      // 3️⃣ Detect combined name + relation (e.g. "Kallu S/O Baburam")
      const nameRelMatch = line.match(/^(.*?)\s+(S\/O|W\/O)\s+(.*)$/i);
      if (nameRelMatch) {
        entry.name = nameRelMatch[1].trim();
        entry.relation = `${nameRelMatch[2]} ${nameRelMatch[3]}`.trim();
        continue;
      }

      // 4️⃣ Split on first ':' if present; otherwise split on the first '-' while preserving the dash in the value
      let key: string;
      let value: string;
      if (line.includes(':')) {
        const [keyRaw, ...rest] = line.split(':');
        key = keyRaw.trim().toLowerCase();
        value = rest.join(':').trim();
      } else if (line.includes('-')) {
        const idx = line.indexOf('-');
        const keyRaw = line.slice(0, idx);
        key = keyRaw.trim().toLowerCase();
        value = line.slice(idx + 1).trim(); // keep any dash inside the value
      } else {
        continue; // unrecognizable line
      }
      if (!value) continue;

      // 5️⃣ Map the key to the appropriate field (fuzzy matching)
      if ((/^|\s)name$/i.test(key) && !entry.name) {
        entry.name = value;
      } else if (/(s\/o|w\/o|spouse|son|daughter)/i.test(key)) {
        entry.relation = value;
      } else if (/village/.test(key)) {
        entry.village = value;
      } else if (/post\s*office/.test(key)) {
        entry.postOffice = value;
      } else if (/tehsil/.test(key)) {
        entry.tehsil = value;
      } else if (/distt?|district/.test(key)) {
        // Preserve the raw district/value exactly as provided
        entry.district = value.replace(/[\-_]/g, ' ');
      } else if (/pin.?code/.test(key)) {
        entry.pincode = value;
      } else if (/state/.test(key)) {
        entry.state = value;
      } else if (/m\\.?no|mobile/.test(key)) {
        entry.phone = value.replace(/[^\d+]/g, '');
      } else if (/applier|applicant/.test(key)) {
        entry.applicantName = value;
      }
    }

    // If we captured a pending state code, assign it now
    if (pendingStateCode && !entry.stateCode) {
      entry.stateCode = pendingStateCode;
      pendingStateCode = null;
    }

    // Fallback: if we still have no name and the block has more than one line, use the first line as a guess
    if (!entry.name && lines.length > 1) {
      entry.name = lines[0];
    }

    // Only keep entries that have at least one meaningful field
    const hasData = entry.stateCode || entry.name || entry.relation || entry.village || entry.postOffice || entry.tehsil || entry.district || entry.pincode || entry.state || entry.phone || entry.applicantName;
    if (hasData) {
      result.push(entry);
    }
  }

  return result;
}

/**
 * Formats a {@link FormattedEntry} into the user‑requested single‑line style.
 * Example output:
 *   MR. VEER BHAN SINGH S/O MR. OMPRAKASH, VILL - RURIYA, POST OFFICE - ..., DISTT - MAINPURI (UP) - 205130
 *   MOBILE NO - 9993192017
 *   APPLICANT NAME - MR. OMPRAKASH (NH)
 */
export function formatEntry(entry: FormattedEntry): string {
  const lines: string[] = [];

  // Name + relation line (single line)
  const namePart = entry.name.trim();
  const relationPart = entry.relation ? ` ${entry.relation.trim()}` : '';
  let firstLine = `${namePart}${relationPart}`.trim();

  // Append location fields separated by commas
  const locParts: string[] = [];
  if (entry.village) locParts.push(`VILL - ${entry.village}`);
  if (entry.postOffice) locParts.push(`POST OFFICE - ${entry.postOffice}`);
  if (entry.tehsil) locParts.push(`TEHSIL - ${entry.tehsil}`);
  if (entry.district) locParts.push(`DISTT - ${entry.district}`);
  if (entry.pincode) locParts.push(`PINCODE - ${entry.pincode}`);
  if (entry.state) locParts.push(`STATE - ${entry.state}`);
  if (locParts.length) firstLine = `${firstLine}, ${locParts.join(', ')}`;
  lines.push(firstLine);

  // Mobile line
  if (entry.phone) lines.push(`MOBILE NO - ${entry.phone}`);

  // Applicant line with optional state code in parentheses
  if (entry.applicantName) {
    const codePart = entry.stateCode ? ` (${entry.stateCode})` : '';
    lines.push(`APPLICANT NAME - ${entry.applicantName}${codePart}`);
  }

  return lines.join('\n');
}

export { formatWhatsAppText, formatEntry };
