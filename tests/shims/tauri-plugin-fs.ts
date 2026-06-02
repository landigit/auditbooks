import fs from 'fs';

export async function exists(path: string): Promise<boolean> {
  return fs.existsSync(path);
}

export async function remove(path: string): Promise<void> {
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
}
