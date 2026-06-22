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
  stateAbbr?: string; // derived abbreviation (UP, MP, ...)
}

/**
 * Mapping of full state names to their two‑letter abbreviations.
 */
const STATE_ABBR_MAP: Record<string, string> = {
  "Uttar Pradesh": "UP",
  "Madhya Pradesh": "MP",
  "Rajasthan": "RJ",
  "Punjab": "PB",
  "Gujarat": "GJ",
  "Haryana": "HR",
  "Delhi": "DL",
  "Karnataka": "KA",
  "Maharashtra": "MH",
  "Bihar": "BR",
  // add more as needed
};

/**
 * Normalized label map – maps various label spellings to a canonical key.
 */
const LABEL_MAP: Record<string, keyof FormattedEntry> = {
  "name": "name",
  "village": "village",
  "post office": "postOffice",
  "postoffice": "postOffice",
  "post-office": "postOffice",
  "tehsil": "tehsil",
  "district": "district",
  "distt": "district",
  "dist": "district",
  "disst": "district",
  "pin code": "pincode",
  "pincode": "pincode",
  "pin": "pincode",
  "state": "state",
  "m.no": "phone",
  "mobile": "phone",
  "mobile no": "phone",
  "applier": "applicantName",
  "applicant": "applicantName",
};

/**
 * Helper to get the canonical key for a raw label string.
 */
function getCanonicalKey(raw: string): keyof FormattedEntry | null {
  const lowered = raw.toLowerCase().replace(/\s+/g, " ").trim();
  for (const label in LABEL_MAP) {
    const pattern = new RegExp(`^${label}$`, "i");
    if (pattern.test(lowered)) {
      return LABEL_MAP[label];
    }
  }
  return null;
}

/**
 * Parses a raw multiline string copied from WhatsApp into an array of FormattedEntry.
 * It tolerates:
 *   • Timestamp lines that start with "[".
 *   • Sender lines that begin with a phone number.
 *   • Inconsistent label spellings (e.g. "Disst", "Distt").
 *   • Optional two‑letter state‑code lines (e.g. PR, RN) that act as a delimiter for the *next* entry.
 */
export function formatWhatsAppText(rawText: string): FormattedEntry[] {
  // 1️⃣ Strip out timestamp lines, HTL Network lines and lines that start with a phone number or numbering.
  const cleaned = rawText
    .split(/\r?\n/)
    .filter(
      line =>
        !line.trim().startsWith("[") && // timestamps like "[5:00 pm, 18/6/2026]"
        !/^\+?\d{1,3}\s*\d{5,}/.test(line.trim()) && // phone number prefix lines
        !/HTL\s+Network/i.test(line) && // ignore footer lines
        !/^\d+\./.test(line.trim()) // ignore numbering like "1.", "2."
    )
    .join("\n");

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

    const entry: FormattedEntry = { name: "" };

    for (const line of lines) {
      // 3️⃣ Detect combined name + relation (e.g. "Kallu S/O Baburam")
      const nameRelMatch = line.match(/^(.*?)\s+(S\/O|W\/O)\s+(.*)$/i);
      if (nameRelMatch) {
        entry.name = nameRelMatch[1].trim();
        entry.relation = `${nameRelMatch[2]} ${nameRelMatch[3]}`.trim();
        continue;
      }

      // 4️⃣ Flexible parsing for lines that may contain multiple concatenated labels.
      //    Split on hyphens and colons, then walk tokens.
      const tokens = line.split(/[-:]/).map(t => t.trim()).filter(Boolean);
      let pendingKey: keyof FormattedEntry | null = null;
      for (const token of tokens) {
        if (pendingKey) {
          assignValue(entry, pendingKey, token);
          pendingKey = null;
          continue;
        }
        const canonical = getCanonicalKey(token);
        if (canonical) {
          pendingKey = canonical;
        } else {
          // token didn't match any known label – could be a stray value; ignore.
        }
      }
    }

    // Assign any pending state code captured earlier.
    if (pendingStateCode && !entry.stateCode) {
      entry.stateCode = pendingStateCode;
      pendingStateCode = null;
    }

    // Derive state abbreviation from full state name if present.
    if (entry.state && !entry.stateAbbr) {
      const abbr = STATE_ABBR_MAP[entry.state.trim()];
      if (abbr) entry.stateAbbr = abbr;
    }

    // Fallback: if name still empty but we have multiple lines, use first line.
    if (!entry.name && lines.length > 1) {
      entry.name = lines[0];
    }

    const hasData = entry.stateCode || entry.name || entry.relation || entry.village || entry.postOffice || entry.tehsil || entry.district || entry.pincode || entry.state || entry.phone || entry.applicantName;
    if (hasData) result.push(entry);
  }

  return result;
}

/**
 * Assigns a value to the appropriate field on the entry based on the canonical key.
 */
function assignValue(entry: FormattedEntry, key: keyof FormattedEntry, rawValue: string) {
  const value = rawValue.trim();
  if (!value) return;
  switch (key) {
    case "name":
      if (!entry.name) entry.name = value;
      break;
    case "relation":
      entry.relation = value;
      break;
    case "village":
      entry.village = value;
      break;
    case "postOffice":
      entry.postOffice = value;
      break;
    case "tehsil":
      entry.tehsil = value;
      break;
    case "district":
      entry.district = value.replace(/[\-_]/g, " ");
      break;
    case "pincode":
      entry.pincode = value;
      break;
    case "state":
      entry.state = value;
      break;
    case "phone":
      entry.phone = value.replace(/[^\d+]/g, "");
      break;
    case "applicantName":
      entry.applicantName = value;
      break;
    default:
      break;
  }
}

/**
 * Formats a FormattedEntry into the user‑requested single‑line style.
 * Example output:
 *   MR. VEER BHAN SINGH S/O MR. OMPRAKASH, VILL - RURIYA, TEHSIL - GHIROR, DISTT - MAINPURI (UP) - 205130
 *   MOBILE NO - 9993192017
 *   APPLICANT NAME - MR. OMPRAKASH (RJ)
 */
export function formatEntry(entry: FormattedEntry): string {
  const name = entry.name ? entry.name.toUpperCase() : "";
  const relation = entry.relation ? ` ${entry.relation.toUpperCase()}` : "";
  const village = entry.village ? `, VILL - ${entry.village.toUpperCase()}` : "";
  const postOffice = entry.postOffice ? `, POST - ${entry.postOffice.toUpperCase()}` : "";
  const tehsil = entry.tehsil ? `, TEHSIL - ${entry.tehsil.toUpperCase()}` : "";
  const district = entry.district ? `, DISTT - ${entry.district.toUpperCase()}` : "";
  const state = entry.stateAbbr ? ` (${entry.stateAbbr.toUpperCase()})` : (entry.state ? ` (${entry.state.toUpperCase()})` : "");
  const pincode = entry.pincode ? ` - ${entry.pincode}` : "";
  const phone = entry.phone ? `\nMOBILE NO - ${entry.phone}` : "";
  const applier = entry.applicantName 
    ? `\nAPPLICANT NAME - ${entry.applicantName.toUpperCase()}${entry.stateCode ? ` (${entry.stateCode.toUpperCase()})` : ""}` 
    : "";

  return `${name}${relation}${village}${postOffice}${tehsil}${district}${state}${pincode}${phone}${applier}`;
}
