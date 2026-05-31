import fs from 'fs';
import path from 'path';

const modelsDir = path.resolve('models');

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(modelsDir);
console.log(`Found ${files.length} typescript files in models/`);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (
    !content.includes('extends Doc') &&
    !content.includes('extends Transactional') &&
    !content.includes('extends Invoice') &&
    !content.includes('extends InvoiceItem')
  ) {
    continue;
  }

  // Regex to match property declarations inside class body
  // e.g., "  items?: InvoiceItem[];" or "  party?: string;"
  // We want to avoid matching methods, getters, setters, or properties with initializers (like formulas: FormulaMap = { ... })
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match line starting with spaces, then property name, optional ?, colon, type, and semicolon, with NO = sign.
    // Exclude keywords like static, get, set, readonly, private, protected, public, declare.
    const match = line.match(
      /^(\s+)(?!(?:static|get|set|readonly|private|protected|public|declare|constructor)\b)(\w+)\??:\s+([^=;]+);$/
    );
    if (match) {
      const indentation = match[1];
      const propName = match[2];
      const type = match[3];

      lines[i] = `${indentation}declare ${propName}?: ${type};`;
      console.log(`[${path.basename(file)}] declare ${propName}?: ${type};`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
  }
}
console.log('Declare injection complete!');
