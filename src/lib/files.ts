import JSZip from 'jszip';
import { parsePlist } from './plist';
import type { AppInfo } from './types';

/** Read an uploaded file (.zip with .app bundle, or Info.plist directly) and return AppInfo. */
export async function processFile(file: File): Promise<AppInfo> {
  if (file.name.endsWith('.zip')) {
    return processZip(file);
  }
  if (file.name.endsWith('.plist') || file.name === 'Info.plist') {
    return parsePlist(await file.text());
  }
  throw new Error(
    'Please upload a .zip file containing an .app bundle or an Info.plist file',
  );
}

async function processZip(file: File): Promise<AppInfo> {
  const zip = await JSZip.loadAsync(file);
  let infoPlistPath: string | null = null;
  zip.forEach((relativePath) => {
    if (/\.app\/Contents\/Info\.plist$/.test(relativePath)) {
      infoPlistPath = relativePath;
    }
  });
  if (!infoPlistPath) throw new Error('No Info.plist found in the .app bundle');
  const entry = zip.file(infoPlistPath);
  if (!entry) throw new Error('Could not read Info.plist from zip');
  return parsePlist(await entry.async('string'));
}
