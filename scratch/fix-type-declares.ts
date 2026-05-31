/**
 * fix-type-declares.ts
 *
 * Removes incorrectly placed `declare` modifiers from TypeScript type/interface
 * members and inline object-type annotations.
 *
 * `declare` is ONLY valid directly inside class bodies. It is INVALID in:
 *   - type aliases:   type Foo = { declare bar?: string }
 *   - interfaces:     interface Foo { declare bar?: string }
 *   - inline casts:   db.get(...) as { declare bar?: string }[]
 *   - generic args:   Record<string, { declare bar?: string }>
 *
 * Strategy:
 *   Walk each file character by character to track brace depth and whether
 *   we are inside a class body. Only class-body declares are kept.
 */

import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'e:/code/auditbooks';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Scan all .ts files under ROOT, excluding known dirs */
async function collectFiles(): Promise<string[]> {
  const all: string[] = [];
  const glob = new Bun.Glob('**/*.ts');
  for await (const f of glob.scan({ cwd: ROOT, onlyFiles: true })) {
    const n = f.replace(/\\/g, '/');
    if (
      n.startsWith('node_modules/') ||
      n.startsWith('dist/') ||
      n.startsWith('.git/') ||
      n.startsWith('scratch/')
    )
      continue;
    all.push(`${ROOT}/${n}`);
  }
  return all;
}

/**
 * Given file source text, remove `declare ` from non-class-body locations.
 *
 * We tokenise at a line level:
 *  - Track a stack of frames. Each frame says what opened the current '{' block.
 *  - Frame kinds: 'class' | 'other'
 *  - When we see `class … {` we push a 'class' frame.
 *  - When we see `type … = {` or `interface … {` or any other `{` we push 'other'.
 *  - `declare ` at the start of a line (after whitespace) is removed when
 *    the current frame is NOT 'class'.
 *
 * Limitation: doesn't parse strings/template-literals, but TS source files
 * rarely have `declare ` inside string literals so this is fine in practice.
 */
function processSource(src: string): { out: string; fixes: number } {
  // We'll work line-by-line but also keep track of cumulative brace depth per frame.
  // Stack entry: 'class' | 'other', opened at braceDepth N
  type Frame = { kind: 'class' | 'other'; openDepth: number };
  const stack: Frame[] = [];
  let braceDepth = 0;

  const lines = src.split('\n');
  const out: string[] = [];
  let fixes = 0;

  for (const line of lines) {
    const trimmed = line.trimStart();

    // ── 1. count braces on this line ────────────────────────────────────────
    // (strip string literals to avoid counting braces inside strings)
    const stripped = stripStrings(line);
    const opens = (stripped.match(/\{/g) ?? []).length;
    const closes = (stripped.match(/\}/g) ?? []).length;

    // ── 2. pop stack for each closing brace ─────────────────────────────────
    // Closes happen "before" we evaluate the rest of the line
    let closesToProcess = closes;
    while (closesToProcess > 0) {
      braceDepth--;
      if (stack.length > 0 && stack[stack.length - 1].openDepth >= braceDepth) {
        stack.pop();
      }
      closesToProcess--;
    }

    // ── 3. decide context for this line ─────────────────────────────────────
    const inClassBody =
      stack.length > 0 && stack[stack.length - 1].kind === 'class';

    // ── 4. optionally strip `declare ` ──────────────────────────────────────
    let outLine = line;
    if (!inClassBody && /^\s+declare\s+\w/.test(line)) {
      outLine = line.replace(/\bdeclare\s+/, '');
      fixes++;
    }

    out.push(outLine);

    // ── 5. push new frames for each opening brace ───────────────────────────
    // Detect whether the opening is a class or not.
    const isClassOpener =
      /\b(export\s+)?(abstract\s+)?class\s+\w/.test(stripped) && opens > 0;

    for (let i = 0; i < opens; i++) {
      const kind: 'class' | 'other' =
        isClassOpener && i === 0 ? 'class' : 'other';
      stack.push({ kind, openDepth: braceDepth });
      braceDepth++;
    }
  }

  return { out: out.join('\n'), fixes };
}

/** Replace string literal contents with spaces to avoid false brace matches */
function stripStrings(line: string): string {
  // Replace single-quoted, double-quoted, and template literal content with spaces
  return line
    .replace(/'(?:[^'\\]|\\.)*'/g, (m) => ' '.repeat(m.length))
    .replace(/"(?:[^"\\]|\\.)*"/g, (m) => ' '.repeat(m.length))
    .replace(/`(?:[^`\\]|\\.)*`/g, (m) => ' '.repeat(m.length));
}

// ── main ──────────────────────────────────────────────────────────────────────

const files = await collectFiles();
console.log(`Scanning ${files.length} TypeScript files…\n`);

let totalFiles = 0;
let totalFixes = 0;

for (const filePath of files) {
  const src = readFileSync(filePath, 'utf8');
  if (!src.includes('declare ')) continue;

  const { out, fixes } = processSource(src);
  if (fixes > 0) {
    writeFileSync(filePath, out, 'utf8');
    const rel = filePath.replace(ROOT + '/', '');
    console.log(`  [${fixes} fix${fixes > 1 ? 'es' : ''}]  ${rel}`);
    totalFiles++;
    totalFixes += fixes;
  }
}

console.log(
  `\n✅  Done — ${totalFixes} declare(s) removed across ${totalFiles} file(s).`
);
