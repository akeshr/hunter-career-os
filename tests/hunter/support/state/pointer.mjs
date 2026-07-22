// Repository test support; not part of the distributed Hunter plugin.
export const escapePointerSegment = (segment) =>
  String(segment).replaceAll("~", "~0").replaceAll("/", "~1");

export const appendPointer = (path, segment) =>
  `${path}/${escapePointerSegment(segment)}`;

export const pointer = (...segments) =>
  segments.reduce((path, segment) => appendPointer(path, segment), "");

export const pointerSegments = (path) =>
  path
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
