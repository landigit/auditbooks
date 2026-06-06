import fs from 'fs';
import path from 'path';

const targetPathArg = process.argv[2];
if (!targetPathArg) {
  console.error(
    'Usage: node scripts/migrate-to-lynx-tags.mjs <file-or-directory-path>'
  );
  process.exit(1);
}

const resolvedPath = path.resolve(targetPathArg);

function migrateFile(file) {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(file, 'utf8');

  // Regexp replacements to map HTML nodes and event listeners to Lynx compatible tags
  let newContent = content
    .replace(/<div(\s|>)/g, '<view$1')
    .replace(/<\/div[\s\r\n]*>/g, '</view>')
    .replace(/<span(\s|>)/g, '<text$1')
    .replace(/<\/span[\s\r\n]*>/g, '</text>')
    .replace(/<p(\s|>)/g, '<text$1')
    .replace(/<\/p[\s\r\n]*>/g, '</text>')
    .replace(/<h[1-6](\s|>)/g, '<text$1')
    .replace(/<\/h[1-6][\s\r\n]*>/g, '</text>')
    .replace(/<label(\s|>)/g, '<text$1')
    .replace(/<\/label[\s\r\n]*>/g, '</text>')
    .replace(/<button(\s|>)/g, '<view$1')
    .replace(/<\/button[\s\r\n]*>/g, '</view>')
    .replace(/<hr(\s|>)/g, '<view class="border-b border-border"$1')
    .replace(/<hr\s*\/>/g, '<view class="border-b border-border" />')
    .replace(/@click(\.stop|\.prevent)?=/g, '@tap$1=');

  // Fix duplicate class attributes on view/text elements (including multiline and intermediate attributes)
  function findTags(str, tagName) {
    let results = [];
    let index = 0;
    const startTag = `<${tagName}`;
    while (true) {
      const startIdx = str.indexOf(startTag, index);
      if (startIdx === -1) break;

      const nextChar = str[startIdx + startTag.length];
      if (nextChar && /\w/.test(nextChar)) {
        index = startIdx + startTag.length;
        continue;
      }

      let inDoubleQuotes = false;
      let inSingleQuotes = false;
      let tagEndIdx = -1;
      for (let i = startIdx + startTag.length; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && !inSingleQuotes) {
          inDoubleQuotes = !inDoubleQuotes;
        } else if (char === "'" && !inDoubleQuotes) {
          inSingleQuotes = !inSingleQuotes;
        } else if (char === '>' && !inDoubleQuotes && !inSingleQuotes) {
          tagEndIdx = i;
          break;
        }
      }

      if (tagEndIdx === -1) break;

      const tagMatch = str.slice(startIdx, tagEndIdx + 1);
      const tagContent = str.slice(startIdx + startTag.length, tagEndIdx);
      results.push({ startIdx, endIdx: tagEndIdx + 1, tagMatch, tagContent });
      index = tagEndIdx + 1;
    }
    return results;
  }

  function cleanDuplicateClassesForTag(tagName, str) {
    const tags = findTags(str, tagName);
    for (let i = tags.length - 1; i >= 0; i--) {
      const { startIdx, endIdx, tagMatch, tagContent } = tags[i];
      const classRegex = /(?<![:-])\bclass="([^"]*)"/g;
      const matches = [...tagContent.matchAll(classRegex)];
      if (matches.length > 1) {
        const classValues = matches.map((m) => m[1]);
        const combinedClasses = Array.from(
          new Set(classValues.flatMap((c) => c.split(/\s+/)))
        )
          .filter(Boolean)
          .join(' ');
        const cleanedContent = tagContent.replace(
          /(?<![:-])\bclass="[^"]*"/g,
          ''
        );
        const cleanedTag = `<${tagName} class="${combinedClasses}"${cleanedContent}>`;
        str = str.slice(0, startIdx) + cleanedTag + str.slice(endIdx);
      }
    }
    return str;
  }

  newContent = cleanDuplicateClassesForTag('view', newContent);
  newContent = cleanDuplicateClassesForTag('text', newContent);

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`[Success] Migrated: ${file}`);
  } else {
    console.log(`[Skip] No changes needed: ${file}`);
  }
}

function processPath(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (targetPath.endsWith('.vue')) {
      migrateFile(targetPath);
    }
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(targetPath);
    for (const file of files) {
      processPath(path.join(targetPath, file));
    }
  }
}

console.log(`Starting tag migration on target path: ${resolvedPath}`);
processPath(resolvedPath);
console.log('Migration finished!');
