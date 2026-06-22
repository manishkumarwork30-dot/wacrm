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
 *   • Optional two‑letter state‑code lines.
 */
export function formatWhatsAppText(rawText: string): FormattedEntry[] {
  // 1️⃣ Remove timestamp / sender lines
  const cleaned = rawText
    .split(/\r?\n/)
    .filter(
      line =>
        !line.trim().startsWith('[') && // timestamps like "[5:00 pm, 18/6/2026]"
        !/^\+?\d{1,3}\s*\d{5,}/.test(line.trim()) // lines starting with a phone number
    )
    .join('\n');

  // 2️⃣ Split into blocks – blank line separates distinct entries
  const blocks = cleaned
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  const interim: FormattedEntry[] = [];

  for (const block of blocks) {
    const entry: FormattedEntry = { name: '' };
    const lines = block.split(/\r?\n/).map(l => l.trim());

    for (const line of lines) {
      // Detect a lone two‑letter state code line (e.g. "PR")
      if (/^[A-Z]{2}$/.test(line)) {
        entry.stateCode = line;
        continue;
      }

      // Detect combined name and relation line like "Kallu S/O Baburam"
      const nameRelMatch = line.match(/^(.*?)\s+(S\/O|W\/O)\s+(.*)$/i);
      if (nameRelMatch) {
        entry.name = nameRelMatch[1].trim();
        entry.relation = `${nameRelMatch[2]} ${nameRelMatch[3]}`.trim();
        continue;
      }

      // Split on the first ':' or '-' to get a key/value pair
      const [keyRaw, ...rest] = line.split(/[:\-]/);
      const key = keyRaw.trim().toLowerCase();
      const value = rest.join(':').trim();
      if (!value) continue;

      // Fuzzy matching of known fields
      if (/(^|\s)name$/i.test(key) && !entry.name) {
        entry.name = value;
      } else if (/(s\/o|w\/o|spouse|son|daughter)/i.test(key)) {
        entry.relation = value;
      } else if (/village/.test(key)) {
        entry.village = value;
      } else if (/post\s*office/.test(key)) {
        entry.postOffice = value;
      } else if (/tehsil/.test(key)) {
        entry.tehsil = value;
      } else if (/dist|district/.test(key)) {
        entry.district = value.replace(/[\-_]/g, ' ');
      } else if (/pin.?code/.test(key)) {
        entry.pincode = value;
      } else if (/state/.test(key)) {
        entry.state = value;
      } else if (/m\.?no|mobile/.test(key)) {
        entry.phone = value.replace(/[^\d+]/g, '');
      } else if (/applier|applicant/.test(key)) {
        entry.applicantName = value;
      }
    }

    // Fallback: if name is still empty, use the first line as a guess
    if (!entry.name && lines.length) {
      entry.name = lines[0];
    }

    // Keep entry if it has any meaningful data
    const hasData = entry.stateCode || entry.name || entry.relation || entry.village || entry.postOffice || entry.tehsil || entry.district || entry.pincode || entry.state || entry.phone || entry.applicantName;
    if (hasData) {
      interim.push(entry);
    }
  }

  // Merge solitary state‑code entries into the previous record
  const final: FormattedEntry[] = [];
  for (const e of interim) {
    const isStateOnly = e.stateCode && !e.name && !e.relation && !e.village && !e.postOffice && !e.tehsil && !e.district && !e.pincode && !e.state && !e.phone && !e.applicantName;
    if (isStateOnly && final.length) {
      final[final.length - 1].stateCode = e.stateCode;
    } else {
      final.push(e);
    }
  }

  return final;
}
