// src/lib/whatsapp/messageFormatter.test.ts

import { expect, test } from 'vitest';
import { formatWhatsAppText, FormattedEntry } from './messageFormatter';

const sample = `Kallu S/O Baburam 
Village- Malgaon 
Post Office - Deorijeet 
Tehsil-District - Badaun 
Pincode-243634 
State- Uttar Pradesh 
M.no - 9756589591
Applier Name- Kallu 

PR

Manvendra Singh Panwar S/O Virendra Singh Panwar 
Village - Nipania 
Post office- Ujjain M.L.Nagar
Tehsil- Ghatiya 
Disst- Ujjain
Pin code- 456010
State- Madhya Pradesh 
M.no.=8120248149
Applier Name- Manvendra Singh Panwar 

RN`;

test('parses sample WhatsApp block', () => {
  const entries: FormattedEntry[] = formatWhatsAppText(sample);
  expect(entries.length).toBe(2);
  // First entry checks
  const first = entries[0];
  expect(first.name).toBe('Kallu');
  expect(first.relation).toBe('S/O Baburam');
  expect(first.village).toBe('Malgaon');
  expect(first.postOffice).toBe('Deorijeet');
  expect(first.tehsil).toBe('District - Badaun');
  expect(first.pincode).toBe('243634');
  expect(first.state).toBe('Uttar Pradesh');
  expect(first.phone).toBe('9756589591');
  expect(first.applicantName).toBe('Kallu');
  expect(first.stateCode).toBe('PR');
  // Second entry checks
  const second = entries[1];
  expect(second.name).toBe('Manvendra Singh Panwar');
  expect(second.relation).toBe('S/O Virendra Singh Panwar');
  expect(second.stateCode).toBe('RN');
});
