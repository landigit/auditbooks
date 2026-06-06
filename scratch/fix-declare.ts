/**
 * Fix invalid `declare` keywords that were incorrectly added inside type aliases,
 * interfaces, and inline object types (not class bodies).
 *
 * The `declare` keyword is ONLY valid inside class bodies.
 * This script removes `declare ` from type/interface/object-type contexts.
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "bun";

// We look for type aliases and interfaces and inline casts containing `declare`
// The approach: parse each file and remove `declare ` inside non-class blocks.
// Simpler approach: use regex to find `export type X = {` and `interface X {` blocks
// and strip `declare ` from fields inside them.

const files = await Array.fromAsync(
  glob("**/*.ts", {
    cwd: "e:/code/auditbooks",
    ignore: ["node_modules/**", ".git/**", "dist/**"],
  }),
);

let totalFixed = 0;

for (const file of files) {
  const fullPath = `e:/code/auditbooks/${file}`;
  const content = readFileSync(fullPath, "utf8");

  // Check if file has any `declare` inside type/interface blocks
  // Pattern: look for lines with "declare " that appear inside type/interface definitions
  // We do this by tracking brace depth and whether we're in a class vs type/interface

  if (!content.includes("declare ")) continue;

  const lines = content.split("\n");
  let inTypeBlock = false;
  let inClassBlock = false;
  let braceDepth = 0;
  let typeStartDepth = -1;
  let classStartDepth = -1;
  let changed = false;
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect class/type/interface starts
    // Check for class declarations
    const isClassStart =
      /^\s*(export\s+)?(abstract\s+)?class\s+\w/.test(line) &&
      line.includes("{");
    const isTypeStart =
      /^\s*(export\s+)?type\s+\w+.*=\s*(\|?\s*)?(\{|$)/.test(line) &&
      !isClassStart;
    const isInterfaceStart =
      /^\s*(export\s+)?interface\s+\w/.test(line) && !isClassStart;
    const isInlineTypeAssertion =
      /\)\s+as\s+\{/.test(line) || /as\s+\{/.test(line);

    // Count braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (isClassStart) {
      classStartDepth = braceDepth;
      inClassBlock = true;
    }

    if (isTypeStart || isInterfaceStart) {
      typeStartDepth = braceDepth;
      inTypeBlock = true;
    }

    braceDepth += openBraces - closeBraces;

    // Remove `declare ` if we're inside a type/interface OR inline type assertion
    // but NOT in a class body
    let newLine = line;

    const isInTypeContext = inTypeBlock && !inClassBlock;
    const isInInlineTypeAssertion =
      !inClassBlock &&
      (isInlineTypeAssertion || (inTypeBlock && braceDepth > typeStartDepth));

    // Simple heuristic: if line has `declare ` but we're not inside a class
    if (!inClassBlock && line.includes("  declare ") && !isClassStart) {
      // Extra check: only remove if it's a type member pattern (indent + declare + field: type)
      if (
        /^\s+declare\s+\w/.test(line) &&
        !/^\s*declare\s+(class|function|const|let|var|type|interface|abstract)/.test(
          line,
        )
      ) {
        newLine = line.replace(/declare\s+/, "");
        if (newLine !== line) {
          changed = true;
        }
      }
    }

    newLines.push(newLine);

    // Update context trackers based on brace count
    if (inTypeBlock && braceDepth <= typeStartDepth && closeBraces > 0) {
      inTypeBlock = false;
      typeStartDepth = -1;
    }

    if (inClassBlock && braceDepth <= classStartDepth && closeBraces > 0) {
      inClassBlock = false;
      classStartDepth = -1;
    }
  }

  if (changed) {
    writeFileSync(fullPath, newLines.join("\n"), "utf8");
    console.log(`Fixed: ${file}`);
    totalFixed++;
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
