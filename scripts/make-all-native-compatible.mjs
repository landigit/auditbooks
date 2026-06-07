import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.resolve(__dirname, "../src/pages");

function getPageName(file) {
  const base = path.basename(file, ".vue");
  // Add spaces before capital letters
  return base.replace(/([A-Z])/g, " $1").trim();
}

function processFile(file) {
  // Skip App.vue and DatabaseSelector.vue since they are manually crafted
  if (file.endsWith("DatabaseSelector.vue") || file.endsWith("App.vue")) {
    return;
  }

  let content = fs.readFileSync(file, "utf8");

  // Skip if already contains isLynx in template
  if (content.includes('v-if="!isLynx"') || content.includes('v-else-if="!isLynx"')) {
    console.log(`[Skip] Already compatible: ${file}`);
    return;
  }

  // Find outermost <template> and </template>
  const templateStartTag = "<template>";
  const templateStartIdx = content.indexOf(templateStartTag);
  if (templateStartIdx === -1) {
    console.log(`[Skip] No <template> tag: ${file}`);
    return;
  }

  const startContentIdx = templateStartIdx + templateStartTag.length;

  // Find matching </template> by counting depth
  let depth = 1;
  let cursor = startContentIdx;
  let templateEndIdx = -1;

  while (cursor < content.length) {
    const nextStart = content.indexOf("<template", cursor);
    const nextEnd = content.indexOf("</template>", cursor);

    if (nextEnd === -1) {
      break;
    }

    if (nextStart !== -1 && nextStart < nextEnd) {
      // Check if it's <template> or <template ...>
      const nextChar = content[nextStart + 9];
      if (nextChar === ">" || nextChar === " " || nextChar === "\r" || nextChar === "\n") {
        depth++;
      }
      cursor = nextStart + 9;
    } else {
      depth--;
      if (depth === 0) {
        templateEndIdx = nextEnd;
        break;
      }
      cursor = nextEnd + 11;
    }
  }

  if (templateEndIdx === -1) {
    console.warn(`[Warn] Could not find matching </template> in ${file}`);
    return;
  }

  const innerTemplate = content.slice(startContentIdx, templateEndIdx);
  const pageName = getPageName(file);

  const newInnerTemplate = `
  <view v-if="!isLynx">
    ${innerTemplate.trim()}
  </view>
  <view v-else class="Container dark">
    <view class="Card">
      <view class="Header">
        <text class="Title">${pageName}</text>
        <text class="Subtitle">This page is not supported on Mobile Native yet.</text>
      </view>
    </view>
  </view>
`;

  // Modify script setup to import isLynx
  let newContent =
    content.slice(0, startContentIdx) + newInnerTemplate + content.slice(templateEndIdx);

  // Match <script setup ...>
  const scriptSetupRegex = /<script\s+setup([^>]*)>/;
  const match = newContent.match(scriptSetupRegex);
  if (match) {
    const insertIdx = match.index + match[0].length;
    // Check if isLynx is already imported
    if (!newContent.includes("isLynx")) {
      newContent =
        newContent.slice(0, insertIdx) +
        "\nimport { isLynx } from 'src/utils/interactive';" +
        newContent.slice(insertIdx);
    }
  } else {
    // If no script setup, insert a simple script setup block at the beginning/end
    newContent =
      `<script setup lang="ts">
import { isLynx } from 'src/utils/interactive';
</script>\n` + newContent;
  }

  fs.writeFileSync(file, newContent, "utf8");
  console.log(`[Success] Made native-compatible: ${file}`);
}

function traverse(dir) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (stat.isFile() && item.endsWith(".vue")) {
      processFile(fullPath);
    }
  }
}

console.log(`Scanning pages directory: ${pagesDir}`);
traverse(pagesDir);
console.log("Automated compatibility task finished!");
