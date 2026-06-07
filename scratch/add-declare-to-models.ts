import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'e:/code/auditbooks';

async function collectFiles(): Promise<string[]> {
  const all: string[] = [];
  const glob = new Bun.Glob('models/**/*.ts');
  for await (const f of glob.scan({ cwd: ROOT, onlyFiles: true })) {
    const n = f.replace(/\\/g, '/');
    if (n.includes('/tests/')) continue;
    all.push(`${ROOT}/${n}`);
  }
  return all;
}

function processSource(src: string): { out: string; fixes: number } {
  const lines = src.split('\n');
  const out: string[] = [];
  let fixes = 0;

  // Track class nesting and class name
  let inClass = false;
  let braceDepth = 0;
  let classBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check brace opening/closing
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;

    // Detect class start
    if (/\b(export\s+)?(abstract\s+)?class\s+\w+/.test(line)) {
      inClass = true;
      classBraceDepth = braceDepth;
    }

    let outLine = line;

    if (inClass && braceDepth === classBraceDepth + 1) {
      // We are inside the main class body.
      // Match properties like: "property?: Type;" or "property: Type;" or "property!: Type;"
      // Avoid matching methods "method() {" or properties with initializers "prop = value;" or comments or getters/setters.
      // Specifically: starts with word character, optional ? or !, followed by :, then Type, ending with ; (or no initializer).
      // Also it shouldn't already have 'declare' or 'get' or 'set' or 'private' or 'public' or 'readonly' or 'async' or 'static'.
      const propertyRegex =
        /^\s+([a-zA-Z_$][a-zA-Z0-9_$]*[?!]?)\s*:\s*([^=;]+);/;
      if (propertyRegex.test(line)) {
        const match = line.match(propertyRegex);
        if (match) {
          const propName = match[1];
          // Ensure it doesn't start with keywords
          const leadTrimmed = line.trimStart();
          if (
            !leadTrimmed.startsWith('declare ') &&
            !leadTrimmed.startsWith('private ') &&
            !leadTrimmed.startsWith('public ') &&
            !leadTrimmed.startsWith('protected ') &&
            !leadTrimmed.startsWith('readonly ') &&
            !leadTrimmed.startsWith('static ') &&
            !leadTrimmed.startsWith('get ') &&
            !leadTrimmed.startsWith('set ')
          ) {
            // Prepend declare
            const whitespace = line.match(/^\s*/)?.[0] ?? '';
            outLine = `${whitespace}declare ${leadTrimmed}`;
            fixes++;
          }
        }
      }
    }

    braceDepth += opens - closes;
    if (inClass && braceDepth <= classBraceDepth) {
      inClass = false;
    }

    out.push(outLine);
  }

  return { out: out.join('\n'), fixes };
}

const files = await collectFiles();
console.log(`Scanning ${files.length} model files…\n`);

let totalFiles = 0;
let totalFixes = 0;

for (const filePath of files) {
  const src = readFileSync(filePath, 'utf8');
  const { out, fixes } = processSource(src);
  if (fixes > 0) {
    writeFileSync(filePath, out, 'utf8');
    const rel = filePath.replace(ROOT + '/', '');
    console.log(`  [${fixes} declare added]  ${rel}`);
    totalFiles++;
    totalFixes += fixes;
  }
}

console.log(
  `\n✅ Done — ${totalFixes} declare(s) added across ${totalFiles} file(s).`
);
