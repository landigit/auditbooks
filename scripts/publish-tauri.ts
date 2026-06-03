import { $ } from 'pnpm';
import fs from 'fs';
import path from 'path';

// 1. Sync and load version
const pkgPath = path.join(import.meta.dir, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

const token = process.env.GH_TOKEN;
if (!token) {
  console.error('GH_TOKEN environment variable is not set!');
  process.exit(1);
}

const owner = 'landigit';
const repo = 'auditbooks';

// 2. Build tauri app
console.log('Building Tauri application...');
await $`pnpm run build:tauri`;

// 3. Find built files
const releaseDir = path.join(
  import.meta.dir,
  '../src-tauri/target/release/bundle'
);
const msiDir = path.join(releaseDir, 'msi');
const nsisDir = path.join(releaseDir, 'nsis');

const filesToUpload: string[] = [];

if (fs.existsSync(msiDir)) {
  const msiFiles = fs.readdirSync(msiDir).filter((f) => f.endsWith('.msi'));
  for (const f of msiFiles) filesToUpload.push(path.join(msiDir, f));
}
if (fs.existsSync(nsisDir)) {
  const nsisFiles = fs.readdirSync(nsisDir).filter((f) => f.endsWith('.exe'));
  for (const f of nsisFiles) filesToUpload.push(path.join(nsisDir, f));
}

if (filesToUpload.length === 0) {
  console.error('No built installer files found to upload!');
  process.exit(1);
}

console.log('Files to upload:', filesToUpload);

// 4. Create/Get GitHub Release
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function getOrCreateRelease() {
  console.log(`Checking if release for tag ${tag} exists...`);
  let res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`,
    { headers }
  );
  if (res.status === 200) {
    const data: any = await res.json();
    console.log(`Found existing release: ${data.id}`);
    return data;
  }

  console.log(`Creating draft release for tag ${tag}...`);
  res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: 'master',
      name: `Auditbooks v${version}`,
      body: `Release v${version} of Auditbooks.`,
      draft: true,
      prerelease: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create release: ${await res.text()}`);
  }

  const data: any = await res.json();
  console.log(`Created release: ${data.id}`);
  return data;
}

try {
  const release = await getOrCreateRelease();
  const uploadUrlTemplate = release.upload_url; // Format: "https://uploads.github.com/repos/owner/repo/releases/id/assets{?name,label}"
  const uploadBaseUrl = uploadUrlTemplate.split('{')[0];

  // Delete existing assets with same name if any
  if (release.assets && release.assets.length > 0) {
    for (const asset of release.assets) {
      const fileNamesToUpload = filesToUpload.map((f) => path.basename(f));
      if (fileNamesToUpload.includes(asset.name)) {
        console.log(`Deleting existing asset ${asset.name} (${asset.id})...`);
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`,
          {
            method: 'DELETE',
            headers,
          }
        );
      }
    }
  }

  // 5. Upload files
  for (const filePath of filesToUpload) {
    const fileName = path.basename(filePath);
    console.log(`Uploading ${fileName}...`);
    const fileData = fs.readFileSync(filePath);
    const uploadRes = await fetch(
      `${uploadBaseUrl}?name=${encodeURIComponent(fileName)}`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileData.length.toString(),
        },
        body: fileData,
      }
    );

    if (uploadRes.ok) {
      console.log(`Successfully uploaded ${fileName}`);
    } else {
      console.error(`Failed to upload ${fileName}: ${await uploadRes.text()}`);
    }
  }

  console.log('All files uploaded successfully!');
} catch (error) {
  console.error('Error creating release or uploading assets:', error);
  process.exit(1);
}
