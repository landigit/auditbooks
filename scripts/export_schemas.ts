import { getSchemas } from '../schemas';
import * as fs from 'fs';

async function exportSchemas() {
  console.log('Exporting schemas...');
  // countryCode '-' and no custom fields for now
  const schemaMap = getSchemas('-', []);
  fs.writeFileSync('backend/schemas.json', JSON.stringify(schemaMap, null, 2));
  console.log('Schemas exported to backend/schemas.json');
}

exportSchemas().catch(console.error);
