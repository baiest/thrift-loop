/* eslint-disable security/detect-non-literal-fs-filename, security/detect-non-literal-regexp --
   every path/pattern here is built from repo-fixed constants and asset paths declared in
   index.html itself, never external input. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_ROOT = join(import.meta.dirname, '..', '..');
const INDEX_HTML_PATH = join(WEB_ROOT, 'index.html');
const PUBLIC_DIR = join(WEB_ROOT, 'public');

const indexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');

function metaContent(attr: 'name' | 'property', key: string): string | undefined {
  const pattern = new RegExp(`<meta\\s+${attr}=["']${key}["']\\s+content=["']([^"']+)["']`);
  return pattern.exec(indexHtml)?.[1];
}

function linkHref(rel: string): string | undefined {
  const pattern = new RegExp(`<link\\s+rel=["']${rel}["']\\s+href=["']([^"']+)["']`);
  return pattern.exec(indexHtml)?.[1];
}

const REQUIRED_META_NAMES = ['description', 'theme-color'] as const;

const REQUIRED_META_PROPERTIES = [
  'og:type',
  'og:site_name',
  'og:url',
  'og:title',
  'og:description',
  'og:image',
  'og:image:width',
  'og:image:height',
  'og:image:alt',
] as const;

const REQUIRED_TWITTER_META_NAMES = [
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
] as const;

function localPathOf(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '');
}

describe('index.html head meta', () => {
  it.each(REQUIRED_META_NAMES)('has a non-empty <meta name="%s">', (name) => {
    expect(metaContent('name', name)).toBeTruthy();
  });

  it.each(REQUIRED_META_PROPERTIES)('has a non-empty <meta property="%s">', (property) => {
    expect(metaContent('property', property)).toBeTruthy();
  });

  it.each(REQUIRED_TWITTER_META_NAMES)('has a non-empty <meta name="%s">', (name) => {
    expect(metaContent('name', name)).toBeTruthy();
  });

  it('has a canonical link', () => {
    expect(linkHref('canonical')).toBeTruthy();
  });

  it('has a manifest link pointing at an existing file', () => {
    const href = linkHref('manifest');
    expect(href).toBeTruthy();
    expect(existsSync(join(PUBLIC_DIR, localPathOf(href ?? '')))).toBe(true);
  });

  it.each(['icon', 'apple-touch-icon'] as const)(
    'has a %s link pointing at an existing file',
    (rel) => {
      const href = linkHref(rel);
      expect(href).toBeTruthy();
      expect(existsSync(join(PUBLIC_DIR, localPathOf(href ?? '')))).toBe(true);
    },
  );

  it('og:image and twitter:image point at an existing file', () => {
    const ogImage = metaContent('property', 'og:image');
    const twitterImage = metaContent('name', 'twitter:image');
    expect(ogImage).toBeTruthy();
    expect(twitterImage).toBeTruthy();
    expect(existsSync(join(PUBLIC_DIR, localPathOf(ogImage ?? '')))).toBe(true);
    expect(existsSync(join(PUBLIC_DIR, localPathOf(twitterImage ?? '')))).toBe(true);
  });

  it('robots.txt exists and allows crawling', () => {
    const robotsPath = join(PUBLIC_DIR, 'robots.txt');
    expect(existsSync(robotsPath)).toBe(true);
    expect(readFileSync(robotsPath, 'utf8')).toContain('User-agent: *');
  });

  it('site.webmanifest is valid and its icons exist', () => {
    const manifestPath = join(PUBLIC_DIR, 'site.webmanifest');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      name?: string;
      short_name?: string;
      theme_color?: string;
      icons?: { src: string }[];
    };
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThan(0);
    for (const icon of manifest.icons ?? []) {
      expect(existsSync(join(PUBLIC_DIR, localPathOf(icon.src)))).toBe(true);
    }
  });
});
