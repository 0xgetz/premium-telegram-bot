import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from '../config.js';

const MAX_BYTES = config.maxDownloadMb * 1024 * 1024;
const TIMEOUT_MS = 180_000;

export interface DownloadResult {
  path: string;
  dir: string;
  title: string;
}

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 * 8 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

/** True if a string looks like an http(s) URL. */
export function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

async function getTitle(url: string): Promise<string> {
  try {
    return (await run(['--no-playlist', '--print', '%(title)s', url])).split('\n')[0] || 'media';
  } catch {
    return 'media';
  }
}

function firstFile(dir: string): string | null {
  const files = readdirSync(dir).filter((f) => !f.endsWith('.part'));
  return files.length ? join(dir, files[0]) : null;
}

/** Download best audio and convert to mp3. Requires yt-dlp + ffmpeg installed. */
export async function downloadAudio(url: string): Promise<DownloadResult> {
  const dir = mkdtempSync(join(tmpdir(), 'tgdl-'));
  const title = await getTitle(url);
  await run([
    '--no-playlist',
    '--max-filesize', `${config.maxDownloadMb}M`,
    '-x', '--audio-format', 'mp3', '--audio-quality', '5',
    '-o', join(dir, 'out.%(ext)s'),
    url,
  ]);
  const path = firstFile(dir);
  if (!path) {
    cleanup(dir);
    throw new Error(`File too large (over ${config.maxDownloadMb}MB) or unavailable.`);
  }
  return { path, dir, title };
}

/** Download best mp4 video under the size cap. Requires yt-dlp + ffmpeg. */
export async function downloadVideo(url: string): Promise<DownloadResult> {
  const dir = mkdtempSync(join(tmpdir(), 'tgdl-'));
  const title = await getTitle(url);
  const mb = config.maxDownloadMb;
  await run([
    '--no-playlist',
    '--max-filesize', `${mb}M`,
    '-f', `best[ext=mp4][filesize<${mb}M]/best[filesize<${mb}M]/best[ext=mp4]/best`,
    '--merge-output-format', 'mp4',
    '-o', join(dir, 'out.%(ext)s'),
    url,
  ]);
  const path = firstFile(dir);
  if (!path) {
    cleanup(dir);
    throw new Error(`File too large (over ${mb}MB) or unavailable.`);
  }
  return { path, dir, title };
}

export function cleanup(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export { MAX_BYTES };
