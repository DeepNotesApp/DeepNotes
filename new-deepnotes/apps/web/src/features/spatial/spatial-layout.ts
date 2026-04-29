/** World positions for page pins on an overview canvas (deterministic spiral). */
export function spiralPagePinLayout(
  count: number,
): readonly { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i * 0.85;
    const r = 36 + i * 42;
    out.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
  }
  return out;
}
