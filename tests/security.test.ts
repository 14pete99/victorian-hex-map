// Static security checks on the source, the dependency lockfile and the CI workflows. They need no
// network; `npm run check:security` adds the advisory and registry-signature checks that do.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** Files under a folder with one of the extensions, as paths from the repository root. */
function filesUnder(folder: string, extensions: readonly string[]): string[] {
  if (!existsSync(join(ROOT, folder))) return [];
  return readdirSync(join(ROOT, folder), { withFileTypes: true }).flatMap((entry) => {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) return filesUnder(path, extensions);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [path] : [];
  });
}

const MAP_CODE = filesUnder('src/map', ['.ts', '.tsx']);
const ALL_CODE = filesUnder('src', ['.ts', '.tsx']);
const ALL_CSS = filesUnder('src', ['.css']);
const WORKFLOWS = filesUnder('.github/workflows', ['.yml', '.yaml']);

/**
 * Sites the source may link to: the data's primary sources, the licence it is published under, this
 * project's repository and the address the demo names as its canonical copy.
 */
const LINK_HOSTS = ['www.vec.vic.gov.au', 'www.parliament.vic.gov.au', 'creativecommons.org', 'github.com', 'ioracing.com'];

/** Every match of a pattern in a set of files, as "path: match". */
function matches(paths: readonly string[], pattern: RegExp): string[] {
  return paths.flatMap((path) => [...read(path).matchAll(pattern)].map((match) => `${path}: ${match[0]}`));
}

describe('the map folder is self-contained', () => {
  it('finds the source it is checking', () => {
    expect(MAP_CODE).toContain('src/map/HexMap.tsx');
    expect(ALL_CSS).toContain('src/map/hex-map.css');
  });

  it('imports only React and its own files', () => {
    const specifiers = MAP_CODE.flatMap((path) =>
      [...read(path).matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)].map((match) => ({ path, specifier: match[1] })),
    );
    expect(specifiers.length).toBeGreaterThan(10);
    const outside = specifiers.filter(({ specifier }) => specifier !== 'react' && !/^\.\/[\w.-]+$/.test(specifier));
    expect(outside).toEqual([]);
  });
});

describe('the source has no injection, network or storage code', () => {
  const FORBIDDEN: Record<string, RegExp> = {
    'raw HTML': /dangerouslySetInnerHTML|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/g,
    'code from strings': /\beval\s*\(|new\s+Function\b|set(?:Timeout|Interval)\s*\(\s*['"`]/g,
    'network calls': /\bfetch\s*\(|XMLHttpRequest|\bWebSocket\b|\bEventSource\b|sendBeacon|\bimport\s*\(/g,
    'browser storage': /localStorage|sessionStorage|indexedDB|document\.cookie/g,
    'cross-window messaging': /postMessage|window\.open\s*\(/g,
  };

  for (const [name, pattern] of Object.entries(FORBIDDEN)) {
    it(`uses no ${name}`, () => {
      expect(matches(ALL_CODE, pattern)).toEqual([]);
    });
  }
});

describe('external links and resources', () => {
  it('links only over HTTPS to the approved sites', () => {
    const urls = matches([...ALL_CODE, ...ALL_CSS, 'index.html'], /https?:\/\/[^\s'"`<>)]+/g);
    const refused = urls.filter((entry) => {
      const url = new URL(entry.slice(entry.indexOf(': ') + 2));
      return url.protocol !== 'https:' || !LINK_HOSTS.includes(url.hostname);
    });
    expect(refused).toEqual([]);
  });

  it('opens new tabs without handing them a reference to the page', () => {
    const anchors = ALL_CODE.flatMap((path) => read(path).match(/<a\b[\s\S]*?<\/a>/g) ?? []);
    for (const anchor of anchors.filter((tag) => /target=["']_blank["']/.test(tag))) {
      expect(anchor).toMatch(/rel=["'][^"']*\b(?:noreferrer|noopener)\b/);
    }
  });

  it('loads no stylesheet, font or image from another site', () => {
    expect(matches(ALL_CSS, /@import\b[^;]*/g)).toEqual([]);
    expect(matches(ALL_CSS, /url\(\s*['"]?(?!data:)[^)]*\)/g)).toEqual([]);
  });

  it('loads only the local entry script from index.html', () => {
    const page = read('index.html');
    const sources = [...page.matchAll(/<script\b[^>]*\bsrc="([^"]*)"/g)].map((match) => match[1]);
    expect(sources).toEqual(['/src/main.tsx']);
    expect(page).not.toMatch(/<script\b(?![^>]*\bsrc=)/);
    expect(page).not.toMatch(/\son[a-z]+\s*=/i);
  });
});

describe('dependencies', () => {
  const manifest = JSON.parse(read('package.json')) as { dependencies?: Record<string, string>; scripts?: Record<string, string> };
  const lock = JSON.parse(read('package-lock.json')) as {
    lockfileVersion: number;
    packages: Record<string, { resolved?: string; integrity?: string; hasInstallScript?: boolean; link?: boolean }>;
  };
  const locked = Object.entries(lock.packages).filter(([path]) => path !== '');

  it('has no runtime dependency beyond React', () => {
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(['react', 'react-dom']);
  });

  it('runs nothing on install', () => {
    const lifecycle = ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly', 'prepack', 'postpack'];
    expect(Object.keys(manifest.scripts ?? {}).filter((name) => lifecycle.includes(name))).toEqual([]);
  });

  it('locks every package to the npm registry with a SHA-512 integrity hash', () => {
    expect(lock.lockfileVersion).toBe(3);
    expect(locked.length).toBeGreaterThan(0);
    const loose = locked.filter(([, entry]) => entry.link || !entry.resolved?.startsWith('https://registry.npmjs.org/') || !entry.integrity?.startsWith('sha512-'));
    expect(loose.map(([path]) => path)).toEqual([]);
  });

  it('allows an install script only from the packages listed here', () => {
    // fsevents is an optional macOS file watcher. A new name here must be reviewed before it is added.
    const allowed = ['node_modules/fsevents'];
    expect(locked.filter(([, entry]) => entry.hasInstallScript).map(([path]) => path).filter((path) => !allowed.includes(path))).toEqual([]);
  });
});

describe('CI workflows', () => {
  it('pins every action to a full commit SHA', () => {
    const uses = matches(WORKFLOWS, /^\s*(?:-\s*)?uses:\s*(\S+)/gm).map((entry) => entry.replace(/^(.*?): .*uses:\s*/, '$1: '));
    const unpinned = uses.filter((entry) => !/: (?:\.\/|[\w.-]+\/[\w./-]+@[0-9a-f]{40}$)/.test(entry));
    expect(unpinned).toEqual([]);
  });

  it('grants read-only access by default and never runs on pull_request_target', () => {
    for (const path of WORKFLOWS) {
      const workflow = read(path);
      expect(workflow, path).toMatch(/^permissions:\s*\r?\n\s+contents: read\s*$/m);
      expect(workflow, path).not.toMatch(/pull_request_target|permissions:\s*write-all/);
    }
  });
});
