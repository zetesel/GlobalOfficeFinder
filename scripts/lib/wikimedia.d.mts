export const COMMONS_API: string;
export const LICENSE_WHITELIST_PATTERNS: RegExp[];

export function stripHtml(s: string | undefined): string;
export function licenseAllowed(licenseShort: string | undefined): boolean;
export function canonicalLicenseUrl(licenseShort: string | undefined): string;

export function getCommonsFileInfo(
  fileTitle: string,
  opts?: { headers?: Record<string, string>; width?: number },
): Promise<any | null>;

export interface PhotoRecord {
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  title: string;
}

export function buildPhotoRecord(
  info: any,
  fileTitle: string,
):
  | { photo: PhotoRecord }
  | { rejected: true; reason: string };
