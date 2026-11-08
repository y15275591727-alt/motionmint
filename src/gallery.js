export function visibleDownloadCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : null;
}
