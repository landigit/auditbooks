import * as fs from 'fs';
import * as path from 'path';
import { parseCSV } from '../utils/csvParser';

const translationsFolder = path.resolve(import.meta.dirname, '../translations');
const outputFolder = path.resolve(import.meta.dirname, '../src/public/translations');

async function compile() {
  try {
    // Create output folder if it doesn't exist
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const files = fs.readdirSync(translationsFolder);
    let count = 0;

    for (const file of files) {
      if (!file.endsWith('.csv')) {
        continue;
      }

      const filePath = path.join(translationsFolder, file);
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const rows = parseCSV(csvContent);

      const map: Record<string, { translation: string; context?: string }> = {};

      // Skip header row [Source, Translation, Context]
      for (const row of rows.slice(1)) {
        if (row.length < 2) continue;
        const key = row[0]?.trim();
        const translation = row[1]?.trim();
        if (!key || !translation) continue;

        map[key] = { translation };

        const context = row[2];
        if (context && context.trim()) {
          map[key].context = context.trim();
        }
      }

      const code = path.basename(file, '.csv');
      const outputFilePath = path.join(outputFolder, `${code}.json`);
      fs.writeFileSync(outputFilePath, JSON.stringify(map, null, 2), 'utf-8');
      count++;
    }

    console.log(
      `Successfully compiled ${count} translation files to ${outputFolder}`
    );
  } catch (error) {
    console.error('Failed to compile translations:', error);
    process.exit(1);
  }
}

compile();
