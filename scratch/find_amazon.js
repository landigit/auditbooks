const fs = require('fs');

const files = [
  'src/composables/usePdfInvoice.ts',
  'src/pages/InvoiceDesigner/InvoiceDesigner.vue'
];

files.forEach(file => {
  console.log(`\n=== File: ${file} ===`);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('Amazon')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
});
