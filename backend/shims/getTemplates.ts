import fs from 'fs/promises';
import path from 'path';
import { TemplateFile } from 'utils/types';

export async function getTemplates(posTemplateWidth?: number) {
  const paths = await getPrintTemplatePaths();
  if (!paths) {
    return [];
  }

  const templates: TemplateFile[] = [];
  for (const file of paths.files) {
    const filePath = path.join(paths.root, file);
    const template = await fs.readFile(filePath, 'utf8');
    const stat = await fs.stat(filePath);
    const modifiedDate = new Date(stat.mtimeMs);

    const width =
      file?.split('-')[1]?.split('.')[0] === 'POS'
        ? (posTemplateWidth ?? 0)
        : 0;
    const height = file?.split('-')[1]?.split('.')[0] === 'POS' ? 22 : 0;

    templates.push({
      template,
      file,
      modified: modifiedDate.toISOString(),
      width,
      height,
    });
  }

  return templates;
}

async function getPrintTemplatePaths(): Promise<{
  files: string[];
  root: string;
} | null> {
  let root = '';

  if ((process as any).resourcesPath) {
    try {
      root = path.join((process as any).resourcesPath, `../templates`);
      const files = await fs.readdir(root);
      return { files, root };
    } catch {}
  }

  const currentDir =
    typeof __dirname !== 'undefined'
      ? __dirname
      : typeof (import.meta as any).dir !== 'undefined'
        ? (import.meta as any).dir
        : null;
  if (currentDir) {
    try {
      root = path.join(currentDir, '..', '..', `templates`);
      const files = await fs.readdir(root);
      return { files, root };
    } catch {}
  }

  try {
    root = path.join(process.cwd(), `templates`);
    const files = await fs.readdir(root);
    return { files, root };
  } catch {}

  return null;
}
