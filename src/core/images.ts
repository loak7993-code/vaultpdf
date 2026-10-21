/**
 * Image import helpers. Decoding goes through an <img> element so the
 * browser applies EXIF orientation the same way it will in the thumbnail.
 */

export interface PreparedImage {
  bytes: Uint8Array;
  mime: 'image/png' | 'image/jpeg';
  exportBytes: Uint8Array;
  exportMime: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
}

function readU16(data: Uint8Array, offset: number, littleEndian: boolean): number {
  return littleEndian
    ? data[offset] | (data[offset + 1] << 8)
    : (data[offset] << 8) | data[offset + 1];
}

function readU32(data: Uint8Array, offset: number, littleEndian: boolean): number {
  if (littleEndian) {
    return (
      (data[offset] |
        (data[offset + 1] << 8) |
        (data[offset + 2] << 16) |
        (data[offset + 3] << 24)) >>>
      0
    );
  }
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

function parseTiffOrientation(data: Uint8Array, start: number, end: number): number {
  if (start + 8 > end) return 1;
  const littleEndian = data[start] === 0x49 && data[start + 1] === 0x49;
  if (!littleEndian && !(data[start] === 0x4d && data[start + 1] === 0x4d)) return 1;
  if (readU16(data, start + 2, littleEndian) !== 42) return 1;
  const ifdOffset = readU32(data, start + 4, littleEndian);
  const ifd = start + ifdOffset;
  if (ifd + 2 > end) return 1;
  const entryCount = readU16(data, ifd, littleEndian);
  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) return 1;
    if (readU16(data, entry, littleEndian) === 0x0112) {
      const value = readU16(data, entry + 8, littleEndian);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** EXIF orientation value (1-8) of a JPEG, or 1 when absent or unreadable. */
export function jpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda) return 1;
    const length = readU16(bytes, offset + 2, true);
    if (length < 2) return 1;
    const segmentEnd = Math.min(offset + 2 + length, bytes.length);
    const exifHeader = offset + 4;
    if (
      marker === 0xe1 &&
      segmentEnd - exifHeader >= 6 &&
      bytes[exifHeader] === 0x45 &&
      bytes[exifHeader + 1] === 0x78 &&
      bytes[exifHeader + 2] === 0x69 &&
      bytes[exifHeader + 3] === 0x66 &&
      bytes[exifHeader + 4] === 0x00 &&
      bytes[exifHeader + 5] === 0x00
    ) {
      return parseTiffOrientation(bytes, exifHeader + 6, segmentEnd);
    }
    offset += 2 + length;
  }
  return 1;
}

/**
 * Redraw an image element onto a canvas and encode as PNG. Used to bake
 * EXIF rotation into the pixels so an exported page matches the preview.
 * Canvas size limits on extreme images yield null and the caller falls
 * back to the original bytes.
 */
async function bakeOrientation(
  image: HTMLImageElement,
  width: number,
  height: number,
): Promise<Uint8Array | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return null;
  }
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime: 'image/png' | 'image/jpeg' =
    file.type === 'image/jpeg' || (file.type === '' && /\.jpe?g$/i.test(file.name))
      ? 'image/jpeg'
      : 'image/png';

  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    let exportBytes: Uint8Array = bytes;
    let exportMime = mime;
    if (mime === 'image/jpeg' && jpegOrientation(bytes) > 1) {
      const baked = await bakeOrientation(image, width, height);
      if (baked) {
        exportBytes = baked;
        exportMime = 'image/png';
      }
    }

    return { bytes, mime, exportBytes, exportMime, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
