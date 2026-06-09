/** Initial-letter avatar with a per-user accent color. No image upload (zero cost). */
export default function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: Math.round(size * 0.42),
        color, background: `${color}22`, border: `2px solid ${color}55`,
      }}
    >
      {initial}
    </div>
  )
}
