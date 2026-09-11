import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const PUBLIC_DIR = join(import.meta.dirname, '..', 'apps', 'web', 'public');
const BRAND_500 = '#c4562f';
const BRAND_700 = '#96401f';
const BRAND_50 = '#fbeee7';

const FONTS_LINK =
  // eslint-disable-next-line no-secrets/no-secrets -- a public Google Fonts URL, not a secret
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap';

interface AssetSpec {
  fileName: string;
  width: number;
  height: number;
  html: string;
}

function markHtml({ fontSize, radius }: { fontSize: number; radius: number }): string {
  return `
    <div style="
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${BRAND_500}, ${BRAND_700});
      border-radius: ${radius}px;
    ">
      <span style="
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 700;
        font-size: ${fontSize}px;
        color: ${BRAND_50};
      ">T</span>
    </div>
  `;
}

function ogImageHtml(): string {
  return `
    <div style="
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      gap: 56px;
      padding: 0 96px;
      background: linear-gradient(135deg, ${BRAND_500}, ${BRAND_700});
      font-family: Inter, sans-serif;
    ">
      <div style="
        width: 200px;
        height: 200px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(251, 238, 231, 0.15);
        border-radius: 40px;
      ">
        <span style="
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          font-size: 120px;
          color: ${BRAND_50};
        ">T</span>
      </div>
      <div>
        <div style="
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          font-size: 76px;
          color: ${BRAND_50};
          margin-bottom: 16px;
        ">Thrift Loop</div>
        <div style="
          font-size: 32px;
          color: ${BRAND_50};
          opacity: 0.9;
          max-width: 720px;
        ">Live auctions on secondhand pieces, curated by people, not algorithms.</div>
      </div>
    </div>
  `;
}

function pageDocument(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="${FONTS_LINK}" rel="stylesheet" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

const ASSETS: AssetSpec[] = [
  {
    fileName: 'apple-touch-icon.png',
    width: 180,
    height: 180,
    html: markHtml({ fontSize: 100, radius: 0 }),
  },
  {
    fileName: 'icon-192.png',
    width: 192,
    height: 192,
    html: markHtml({ fontSize: 108, radius: 40 }),
  },
  {
    fileName: 'icon-512.png',
    width: 512,
    height: 512,
    html: markHtml({ fontSize: 290, radius: 108 }),
  },
  {
    fileName: 'icon-maskable-512.png',
    width: 512,
    height: 512,
    html: markHtml({ fontSize: 230, radius: 0 }),
  },
  {
    fileName: 'og-image.png',
    width: 1200,
    height: 630,
    html: ogImageHtml(),
  },
];

async function main(): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- PUBLIC_DIR is a repo-fixed constant
  await mkdir(PUBLIC_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const asset of ASSETS) {
      await page.setViewportSize({ width: asset.width, height: asset.height });
      await page.setContent(pageDocument(asset.html), { waitUntil: 'networkidle' });
      await page.screenshot({ path: join(PUBLIC_DIR, asset.fileName) });
      console.log(`Generated ${asset.fileName}`);
    }
  } finally {
    await browser.close();
  }
}

await main();
