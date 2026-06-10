const { generateCongratulationsDoc } = require('./src/lib/document-generator');
const fs = require('fs');

async function test() {
  const data = {
    name: 'Manish Kumar',
    location: 'Mahoba',
    state: 'UP',
    mobile_no: '918796443057',
    pin_code: '210427',
    land_size: '225 sq.ft',
    ownership: 'Own',
  };
  const pdfBytes = await generateCongratulationsDoc(data);
  fs.writeFileSync('test.pdf', pdfBytes);
  console.log('Done');
}

test();
