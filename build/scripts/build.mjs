import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import builder from 'electron-builder';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as vite from 'vite';
import { getMainProcessCommonConfig } from './helpers.mjs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import auditBooksConfig from '../electron-builder-config.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const buildDirPath = path.normalize(path.join(root, 'dist_electron', 'build'));
const packageDirPath = path.normalize(
  path.join(root, 'dist_electron', 'bundled')
);
const mainFileName = 'main.js';
const commonConfig = getMainProcessCommonConfig(root);

const rawArgs = yargs(hideBin(process.argv))
  .option('nosign', {
    type: 'boolean',
    description: 'Run electron-builder without code signing',
  })
  .option('nopackage', {
    type: 'boolean',
    description: 'Only build the source files, electron-builder will not run',
  });

const argv = rawArgs.argv;

// Determine whether to sign: only sign if --nosign is NOT passed and CSC_KEY_PASSWORD is set.
// When not signing, strip all win signing fields from the config so that app-builder.exe
// never enters the signing pipeline and never downloads winCodeSign (which fails on Windows
// without Developer Mode because the .7z contains macOS symlinks that can't be created).
const shouldSign = !argv.nosign && !!process.env['CSC_KEY_PASSWORD'];
if (!shouldSign) {
  process.env['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false';
}

updatePaths();
await buildMainProcessSource();
await buildRendererProcessSource();
copyPackageJson();

if (!argv.nopackage) {
  await packageApp();
}

function updatePaths() {
  fs.rmSync(buildDirPath, { recursive: true, force: true });
  fs.mkdirSync(buildDirPath, { recursive: true });
  fs.rmSync(packageDirPath, { recursive: true, force: true });
  fs.mkdirSync(packageDirPath, { recursive: true });
  fs.mkdirSync(path.normalize(path.join(buildDirPath, 'node_modules')), {
    recursive: true,
  });
}

async function buildMainProcessSource() {
  const result = await esbuild.build({
    ...commonConfig,
    outdir: path.join(buildDirPath),
  });

  if (result.errors.length) {
    console.error('app build failed due to main process source build');
    result.errors.forEach((err) => console.error(err));
    process.exit(1);
  }
}

async function buildRendererProcessSource() {
  const base = 'app://';
  const outDir = path.join(buildDirPath, 'src');
  await vite.build({
    base: `/${base}`,
    root: path.join(root, 'src'),
    build: { outDir, sourcemap: true },
    plugins: [tailwindcss(), vue()],
    resolve: {
      alias: {
        '@libsql/client': path.join(
          root,
          'src',
          'renderer',
          'mocks',
          'libsql-client.ts'
        ),
        'fs/promises': path.join(root, 'src', 'renderer', 'mocks', 'fs.ts'),
        fs: path.join(root, 'src', 'renderer', 'mocks', 'fs.ts'),
        vue: 'vue/dist/vue.esm-bundler.js',
        fyo: path.join(root, 'fyo'),
        src: path.join(root, 'src'),
        schemas: path.join(root, 'schemas'),
        backend: path.join(root, 'backend'),
        models: path.join(root, 'models'),
        utils: path.join(root, 'utils'),
        regional: path.join(root, 'regional'),
        reports: path.join(root, 'reports'),
        dummy: path.join(root, 'dummy'),
        fixtures: path.join(root, 'fixtures'),
      },
    },
  });
  removeBaseLeadingSlash(outDir, base);
}

/**
 * Copies the package.json file to the build folder with the
 * following changes:
 * - Irrelevant fields are removed.
 * - Non-external deps (those that are bundled) and devDeps are removed.
 * - Main file is updated to the bundled main process JS file.
 */
function copyPackageJson() {
  const packageJsonText = fs.readFileSync(
    path.normalize(path.join(root, 'package.json')),
    {
      encoding: 'utf-8',
    }
  );

  const packageJson = JSON.parse(packageJsonText);
  const keys = [
    'name',
    'version',
    'description',
    'author',
    'homepage',
    'repository',
    'license',
  ];
  const modifiedPackageJson = {};
  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    modifiedPackageJson[key] = packageJson[key];
  }

  modifiedPackageJson.main = mainFileName;
  modifiedPackageJson.dependencies = {};

  for (const dep of commonConfig.external) {
    if (dep === '__proto__' || dep === 'constructor' || dep === 'prototype') {
      continue;
    }
    modifiedPackageJson.dependencies[dep] = packageJson.dependencies[dep];
  }

  fs.writeFileSync(
    path.normalize(path.join(buildDirPath, 'package.json')),
    JSON.stringify(modifiedPackageJson, null, 2),
    {
      encoding: 'utf-8',
    }
  );
}

/**
 * Packages the app using electron builder.
 *
 * Note: this also handles signing and notarization if the
 * appropriate flags are set.
 *
 * Electron builder cli [commands](https://www.electron.build/cli)
 * are passed on as builderArgs.
 */
async function packageApp() {
  const { configureBuildCommand } =
    await await import('electron-builder/out/builder.js');

  const builderArgs = rawArgs
    .command(['build', '*'], 'Build', configureBuildCommand)
    .parse();

  for (const opt of ['nosign', 'nopackage']) {
    if (opt === '__proto__' || opt === 'constructor' || opt === 'prototype') {
      continue;
    }
    delete builderArgs[opt];
  }

  let buildOptions = {
    config: auditBooksConfig,
    ...builderArgs,
  };

  // When not signing, strip win signing fields so app-builder.exe never enters
  // the signing pipeline and does not download winCodeSign (which requires symlink
  // creation rights on Windows that are only available in Developer Mode or as admin).
  if (!shouldSign && buildOptions.config.win) {
    const {
      sign,
      certificateSubjectName,
      signDlls,
      rfc3161TimeStampServer,
      ...winRest
    } = buildOptions.config.win;
    buildOptions = {
      ...buildOptions,
      config: { ...buildOptions.config, win: winRest },
    };
  }

  await builder.build(buildOptions);
}

/**
 * Removes leading slash from all renderer files
 * electron uses a custom registered protocol to load the
 * files: "app://"
 *
 * @param {string} dir
 * @param {string} base
 */
function removeBaseLeadingSlash(dir, base) {
  const normalizedDir = path.normalize(dir);
  for (const file of fs.readdirSync(normalizedDir)) {
    const filePath = path.normalize(path.join(normalizedDir, file));
    if (fs.lstatSync(filePath).isDirectory()) {
      removeBaseLeadingSlash(filePath, base);
      continue;
    }

    if (!filePath.match(/\.(js|css|html)$/i)) continue;
    const contents = fs.readFileSync(filePath).toString('utf-8');
    fs.writeFileSync(filePath, contents.replaceAll('/' + base, base));
  }
}
