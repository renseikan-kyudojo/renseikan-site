// HDR photos: an Ultra HDR JPEG (Pixel, Android, Lightroom) or an ISO 21496-1 JPEG carries a gain map, which Sanity
// strips when the file is uploaded as an image but keeps when it is uploaded as a file. Shared by the Studio
// (sanity/components/photoInputs.tsx) and scripts/upload-photos.mjs, which keep such files as a photo's HDR original.

const MARKERS = ['hdrgm:', 'urn:iso:std:iso:ts:21496'].map((s) => Uint8Array.from(s, (c) => c.charCodeAt(0)));

/** True when the JPEG bytes carry a gain map (Ultra HDR XMP or the ISO 21496-1 namespace). */
export function hasGainMap(/** @type {Uint8Array} */ bytes) {
  return MARKERS.some((m) => {
    for (let i = bytes.indexOf(m[0]); i !== -1 && i <= bytes.length - m.length; i = bytes.indexOf(m[0], i + 1)) {
      let j = 1;
      while (j < m.length && bytes[i + j] === m[j]) j++;
      if (j === m.length) return true;
    }
    return false;
  });
}
