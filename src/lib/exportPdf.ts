import { db } from '../db'

function printHtml(html: string, title: string) {
  const win = window.open('', '_blank')
  if (!win) { alert('Allow pop-ups to export PDF, then try again.'); return }
  win.document.write(html)
  win.document.title = title
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

const PAGE_STYLE = `
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 20px; color: #000; font-size: 13px; }
  h1 { font-size: 20px; font-weight: 900; margin: 0 0 4px; }
  .sub { color: #666; font-size: 11px; margin-bottom: 28px; }
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .section-title { font-size: 14px; font-weight: 700; border-bottom: 2px solid #22c55e; padding-bottom: 4px; margin-bottom: 6px; }
  .section-meta { font-size: 11px; color: #555; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #22c55e; color: #fff; padding: 5px 8px; text-align: left; font-weight: 700; }
  td { padding: 4px 8px; border-bottom: 1px solid #e8e8e8; }
  tr:nth-child(even) td { background: #f7f7f7; }
  ol { margin: 0; padding-left: 20px; }
  li { padding: 3px 0; }
  @media print { @page { margin: 1.2cm; } body { padding: 0; } }
`

export async function exportWorkoutsPdf(units: string): Promise<void> {
  const workouts = await db.workouts.filter(w => w.status === 'finished' && w.deletedAt === null).toArray()
  workouts.sort((a, b) => b.startedAt - a.startedAt)

  const allExercises = await db.exercises.toArray()
  const exMap = new Map(allExercises.map(e => [e.uuid, e.name]))

  let body = ''
  for (const w of workouts) {
    const sets = await db.sets.where('workoutUuid').equals(w.uuid)
      .filter(s => s.deletedAt === null && s.reps > 0).toArray()
    if (sets.length === 0) continue

    const date = new Date(w.startedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
    const dur = w.endedAt ? `${Math.round((w.endedAt - w.startedAt) / 60000)} min` : ''
    const vol = Math.round(sets.reduce((s, x) => s + x.weight * x.reps, 0))
    sets.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))

    const rows = sets.map(s => {
      const type = s.setType && s.setType !== 'normal' ? ` <span style="color:#888;font-size:10px">(${s.setType})</span>` : ''
      return `<tr><td>${h(exMap.get(s.exerciseUuid) ?? '?')}${type}</td><td>${s.setNumber}</td><td>${s.weight} ${units}</td><td>${s.reps}</td>${s.rpe ? `<td>${s.rpe}</td>` : '<td>—</td>'}</tr>`
    }).join('')

    body += `<div class="section">
      <div class="section-title">${h(w.name)}</div>
      <div class="section-meta">${date}${dur ? ` · ${dur}` : ''} · Vol ${vol.toLocaleString()} ${units}</div>
      <table><thead><tr><th>Exercise</th><th>Set</th><th>Weight</th><th>Reps</th><th>RPE</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`
  }

  if (!body) body = '<p style="color:#888">No finished workouts yet.</p>'

  printHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style></head><body>
    <h1>GymBro — Workout History</h1>
    <div class="sub">Exported ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} · ${workouts.length} workout${workouts.length !== 1 ? 's' : ''}</div>
    ${body}
  </body></html>`, 'GymBro Workouts')
}

export async function exportRoutinesPdf(): Promise<void> {
  const routines = await db.routines.filter(r => r.deletedAt === null).toArray()
  const allExercises = await db.exercises.toArray()
  const exMap = new Map(allExercises.map(e => [e.uuid, e.name]))

  let body = ''
  for (const r of routines) {
    const items = r.exerciseOrder.map(uuid => `<li>${h(exMap.get(uuid) ?? '?')}</li>`).join('')
    body += `<div class="section">
      <div class="section-title">${h(r.name)}</div>
      <ol>${items}</ol>
    </div>`
  }

  if (!body) body = '<p style="color:#888">No routines saved yet.</p>'

  printHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style></head><body>
    <h1>GymBro — Routines</h1>
    <div class="sub">Exported ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} · ${routines.length} routine${routines.length !== 1 ? 's' : ''}</div>
    ${body}
  </body></html>`, 'GymBro Routines')
}

function h(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
