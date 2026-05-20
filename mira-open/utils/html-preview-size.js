export function resolveMeasuredHtmlPreviewExtent({
  contentExtent,
  scrollExtent,
  rectExtent,
  viewportExtent,
  minExtent = 1,
}) {
  const sanitize = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.ceil(number) : 0;
  };

  const content = sanitize(contentExtent);
  const scroll = sanitize(scrollExtent);
  const rect = sanitize(rectExtent);
  const viewport = sanitize(viewportExtent);
  const minimum = Math.max(1, sanitize(minExtent) || 1);
  const candidates = [minimum, content];

  if (scroll > 0) {
    const looksViewportBound =
      viewport > 0 && Math.abs(scroll - viewport) <= 1 && content > 0 && content < scroll;
    if (!looksViewportBound) candidates.push(scroll);
  }

  if (rect > 0) {
    const looksViewportBound =
      viewport > 0 && Math.abs(rect - viewport) <= 1 && content > 0 && content < rect;
    if (!looksViewportBound) candidates.push(rect);
  }

  return Math.max(...candidates);
}
