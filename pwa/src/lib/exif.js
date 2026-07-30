// Minimal, self-contained EXIF reader — just enough to pull a photo's capture
// date. No dependencies (the app ships only react/react-dom), no network.
//
// Scans a JPEG's APP1/Exif segment for the TIFF block, walks IFD0 to the Exif
// sub-IFD, and reads DateTimeOriginal (tag 0x9003; falls back to IFD0 DateTime
// 0x0132). Returns epoch-ms, or null when the file isn't a JPEG, has no Exif,
// or anything looks off — callers fall back to File.lastModified.

const TAG_EXIF_IFD = 0x8769; // pointer from IFD0 to the Exif sub-IFD
const TAG_DATETIME_ORIGINAL = 0x9003; // in the Exif sub-IFD
const TAG_DATETIME = 0x0132; // in IFD0 (fallback)

// "YYYY:MM:DD HH:MM:SS" (EXIF's fixed format) -> epoch ms in local time.
function parseExifDate(str) {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
    (str || "").trim(),
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  if (!y || !mo || !d) return null; // all-zero dates happen on some cameras
  const ms = new Date(y, mo - 1, d, h, mi, s).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function readAscii(view, offset, length) {
  let out = "";
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out;
}

// Read the ASCII value of a given tag from an IFD, if present.
function readDateTagFromIfd(view, tiffStart, ifdOffset, le, tag) {
  const base = tiffStart + ifdOffset;
  const count = view.getUint16(base, le);
  for (let i = 0; i < count; i++) {
    const entry = base + 2 + i * 12;
    if (view.getUint16(entry, le) !== tag) continue;
    const valueLen = view.getUint32(entry + 4, le); // ASCII: bytes incl. NUL
    // Values <= 4 bytes sit inline; longer ones are at an offset from TIFF start.
    const valueOffset =
      valueLen <= 4 ? entry + 8 : tiffStart + view.getUint32(entry + 8, le);
    return parseExifDate(readAscii(view, valueOffset, valueLen));
  }
  return null;
}

// Find the pointer stored in an IFD tag (e.g. the Exif sub-IFD pointer).
function readPointerFromIfd(view, tiffStart, ifdOffset, le, tag) {
  const base = tiffStart + ifdOffset;
  const count = view.getUint16(base, le);
  for (let i = 0; i < count; i++) {
    const entry = base + 2 + i * 12;
    if (view.getUint16(entry, le) === tag) return view.getUint32(entry + 8, le);
  }
  return null;
}

function extractDateFromBuffer(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG

  // Walk JPEG marker segments looking for APP1/Exif.
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break; // not a marker — bail
    if (marker === 0xffda) break; // start of scan — image data follows
    const size = view.getUint16(offset + 2);
    if (size < 2) break;
    if (marker === 0xffe1) {
      // "Exif\0\0" then the TIFF block
      const tiffStart = offset + 10;
      if (
        tiffStart + 8 <= view.byteLength &&
        view.getUint32(offset + 4) === 0x45786966 && // "Exif"
        view.getUint16(offset + 8) === 0x0000
      ) {
        const order = view.getUint16(tiffStart);
        const le = order === 0x4949; // II=little, MM=big
        const ifd0 = view.getUint32(tiffStart + 4, le);
        const exifIfd = readPointerFromIfd(
          view,
          tiffStart,
          ifd0,
          le,
          TAG_EXIF_IFD,
        );
        const fromExif =
          exifIfd != null
            ? readDateTagFromIfd(
                view,
                tiffStart,
                exifIfd,
                le,
                TAG_DATETIME_ORIGINAL,
              )
            : null;
        return (
          fromExif ??
          readDateTagFromIfd(view, tiffStart, ifd0, le, TAG_DATETIME)
        );
      }
    }
    offset += 2 + size;
  }
  return null;
}

// Public API: best-effort capture date (epoch ms) from a File/Blob, else null.
// Only the first chunk is read — EXIF lives near the start of a JPEG.
async function readDateTaken(file) {
  try {
    if (!file || typeof file.slice !== "function") return null;
    const chunk = file.slice(0, 256 * 1024);
    const buffer = await chunk.arrayBuffer();
    return extractDateFromBuffer(buffer);
  } catch {
    return null;
  }
}

export { readDateTaken, parseExifDate };
