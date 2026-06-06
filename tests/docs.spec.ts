import { describe, it, expect } from '@rstest/core';
import fs from 'fs';
import path from 'path';

describe('Documentation Integrity', () => {
  const docsDir = path.resolve(__dirname, '../books/docs');
  const imagesDir = path.join(docsDir, 'images');

  it('should have the documentation directory', () => {
    expect(fs.existsSync(docsDir)).toBe(true);
  });

  it('should have the images directory', () => {
    expect(fs.existsSync(imagesDir)).toBe(true);
  });

  const mdFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));

  mdFiles.forEach((file) => {
    describe(`File: ${file}`, () => {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      it('should not be empty', () => {
        expect(content.trim().length).toBeGreaterThan(0);
      });

      it('should have a top-level H1 heading', () => {
        const hasH1 = content.startsWith('# ') || content.match(/^# (.*)/m);
        expect(hasH1).toBeTruthy();
      });

      it('should have valid image references', () => {
        const imgRegex = /!\[.*?\]\((.*?)\)/g;
        const matches = [...content.matchAll(imgRegex)];
        const missingImages: string[] = [];

        matches.forEach((match) => {
          const href = decodeURIComponent(match[1]);
          if (!href.startsWith('http') && !href.startsWith('data:')) {
            const imgPath = path.join(docsDir, href);
            if (!fs.existsSync(imgPath)) {
              missingImages.push(href);
            }
          }
        });
        expect(missingImages).toEqual([]);
      });

      it('should not contain escaped characters like \\u003e', () => {
        expect(content).not.toContain('\\u003e');
        expect(content).not.toContain('\\u003c');
        expect(content).not.toContain('\\u0026');
      });
    });
  });
});
