import { formatWhatsAppText } from '../src/lib/whatsapp/messageFormatter';

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

const entries = formatWhatsAppText(sample);
console.log('entries length', entries.length);
console.log(JSON.stringify(entries, null, 2));
