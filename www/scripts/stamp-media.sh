#!/usr/bin/env bash
# Stamp every image / audio / video asset with INVISIBLE provenance metadata:
# creator handle, title, canonical source URL, and the Free-as-Air (CC0) licence.
# No visible mark is ever added to the pixels. Re-runnable and idempotent.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"          # www/
STATIC="$ROOT/static"
LIC="https://creativecommons.org/publicdomain/zero/1.0/"
FAAL="https://emptyname.org/faal"
CREATOR="emptyname"
RIGHTS="Free as air (CC0) — no copyright, no attribution required. ${FAAL}"

find "$STATIC" -type f \( \
     -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' \
  -o -iname '*.mp3' -o -iname '*.mp4' -o -iname '*.wav' -o -iname '*.webm' -o -iname '*.m4a' \) -print0 |
while IFS= read -r -d '' f; do
  base="$(basename "$f")"
  ext="${base##*.}"; ext="${ext,,}"
  # canonical source = the page that references this asset; else the homepage
  page="$(grep -rlF --include='*.md' "$base" "$ROOT/content" 2>/dev/null | head -1 || true)"
  if [ -n "$page" ]; then
    slug="$(basename "$(dirname "$page")")"
    if [ "$slug" = "content" ]; then src="https://emptyname.org/"; else src="https://emptyname.org/$slug/"; fi
  else
    src="https://emptyname.org/"
  fi
  if [ "$ext" = "mp3" ]; then
    # MP3: ID3 tags (exiftool cannot write XMP to MP3)
    exiftool -q -overwrite_original \
      -Artist="$CREATOR" \
      -Title="${base%.*}" \
      -Copyright="$RIGHTS" \
      -Comment="source: $src — $RIGHTS" \
      "$f" && echo "stamped (id3): ${f#$ROOT/}  (source=$src)" \
            || echo "  skip: $base (id3 write failed)"
  else
    # PRIVACY SCRUB first (images + av): strip anything that could identify a
    # person, device, or workstation — GPS, camera make/model/serials, owner
    # and author fields, editing-software traces, embedded thumbnails (which
    # can hold an uncropped original), and XMP edit history. Orientation and
    # ICC profile are untouched. No-op on already-clean files.
    exiftool -q -overwrite_original \
      -GPS:all= -Makernotes:all= -ThumbnailImage= -PreviewImage= \
      -EXIF:Make= -EXIF:Model= -EXIF:Software= -EXIF:Artist= \
      -EXIF:OwnerName= -EXIF:CameraOwnerName= -EXIF:SerialNumber= \
      -EXIF:BodySerialNumber= -EXIF:LensSerialNumber= -EXIF:LensModel= \
      -EXIF:LensMake= -EXIF:UserComment= -EXIF:XPAuthor= -EXIF:XPComment= \
      -XMP-xmp:CreatorTool= -XMP-xmpMM:all= -XMP-photoshop:all= -PNG:Software= \
      "$f" 2>/dev/null || true
    # images + mp4/webm/wav/m4a: XMP
    exiftool -q -overwrite_original \
      -XMP-dc:Creator="$CREATOR" \
      -XMP-dc:Title="${base%.*}" \
      -XMP-dc:Rights="$RIGHTS" \
      -XMP-dc:Source="$src" \
      -XMP-cc:License="$LIC" \
      -XMP-cc:AttributionName="$CREATOR" \
      -XMP-cc:AttributionURL="https://emptyname.org/" \
      -XMP-xmpRights:Marked=False \
      -XMP-xmpRights:UsageTerms="$RIGHTS" \
      -XMP-xmpRights:WebStatement="$FAAL" \
      "$f" && echo "stamped (xmp): ${f#$ROOT/}  (source=$src)" \
            || echo "  skip: $base (xmp write failed)"
    # JPEG/TIFF also get IPTC (the fields the dominant image search reads + shows as a credit)
    case "$ext" in
      jpg|jpeg|tif|tiff)
        exiftool -q -overwrite_original \
          -IPTC:By-line="$CREATOR" \
          -IPTC:CopyrightNotice="$RIGHTS" \
          -IPTC:Source="$src" \
          -IPTC:Credit="emptyname — emptyname.org" \
          -IPTC:ObjectName="${base%.*}" \
          "$f" >/dev/null 2>&1 && echo "  + IPTC credit fields" || true ;;
    esac
  fi
done
