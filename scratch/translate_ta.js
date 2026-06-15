const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../translations/ta.csv');
if (!fs.existsSync(csvPath)) {
  console.error('ta.csv does not exist!');
  process.exit(1);
}

const translations = {
  Account: 'கணக்கு',
  Accounts: 'கணக்குகள்',
  Active: 'செயலில் உள்ளது',
  'Add Row': 'வரிசையைச் சேர்க்கவும்',
  Address: 'முகவரி',
  Amount: 'தொகை',
  'Balance Sheet': 'இருப்புநிலை குறிப்பு',
  'Bill To': 'பில் பெறுபவர்',
  Cancel: 'ரத்துசெய்',
  Cancelled: 'ரத்து செய்யப்பட்டது',
  Cash: 'ரொக்கம்',
  Closing: 'மூடுதல்',
  Company: 'நிறுவனம்',
  Customer: 'வாடிக்கையாளர்',
  Date: 'தேதி',
  Debit: 'பற்று',
  Credit: 'வரவு',
  Delete: 'நீக்கு',
  Description: 'விளக்கம்',
  Discount: 'தள்ளுபடி',
  Draft: 'வரைவு',
  Email: 'மின்னஞ்சல்',
  Enabled: 'செயல்படுத்தப்பட்டது',
  Entry: 'பதிவு',
  Expense: 'செலவு',
  Export: 'ஏற்றுமதி',
  'General Ledger': 'பொது பேரேடு',
  'Grand Total': 'பெரு மொத்தம்',
  GST: 'ஜிஎஸ்டி',
  Income: 'வருமானம்',
  Invoice: 'இன்வாய்ஸ்',
  Item: 'பொருள்',
  Items: 'பொருட்கள்',
  Language: 'மொழி',
  Location: 'இருப்பிடம்',
  Name: 'பெயர்',
  'Net Total': 'நிகர மொத்தம்',
  No: 'இல்லை',
  Notes: 'குறிப்புகள்',
  Payment: 'கட்டணம்',
  Print: 'அச்சிடு',
  Purchase: 'கொள்முதல்',
  Quantity: 'அளவு',
  Rate: 'விகிதம்',
  Receipt: 'ரசீது',
  Report: 'அறிக்கை',
  Sales: 'விற்பனை',
  Save: 'சேமி',
  Search: 'தேடு',
  Settings: 'அமைப்புகள்',
  Subtotal: 'துணைத் தொகை',
  Supplier: 'வழங்குநர்',
  Tax: 'வரி',
  Taxes: 'வரிகள்',
  Terms: 'விதிமுறைகள்',
  Total: 'மொத்தம்',
  Unit: 'அலகு',
  UOM: 'அலகு',
  User: 'பயனர்',
  Value: 'மதிப்பு',
  Yes: 'ஆம்',
};

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

const updatedLines = lines.map((line, idx) => {
  if (idx === 0) return line; // header

  // Parse CSV line simply (handles quotes if needed)
  let key = '';
  let rest = '';

  if (line.startsWith('"')) {
    const nextQuote = line.indexOf('"', 1);
    if (nextQuote !== -1) {
      key = line.substring(1, nextQuote);
      rest = line.substring(nextQuote + 1);
    } else {
      key = line;
    }
  } else {
    const comma = line.indexOf(',');
    if (comma !== -1) {
      key = line.substring(0, comma);
      rest = line.substring(comma);
    } else {
      key = line;
    }
  }

  const trimmedKey = key.trim();
  if (translations[trimmedKey]) {
    // Return key, translation, context
    const escapedTranslation = translations[trimmedKey].includes(',')
      ? `"${translations[trimmedKey]}"`
      : translations[trimmedKey];
    const originalKey = key.startsWith('"')
      ? key
      : key.includes(',')
        ? `"${key}"`
        : key;
    return `${originalKey},${escapedTranslation},`;
  }

  return line;
});

fs.writeFileSync(csvPath, updatedLines.join('\n'), 'utf-8');
console.log('Updated ta.csv with Tamil translations successfully.');
