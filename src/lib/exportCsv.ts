import { db } from '../db'

function esc(v: string | number): string {
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export async function exportWorkoutsCsv(units: string): Promise<void> {
  const workouts = await db.workouts.filter(w => w.status === 'finished' && w.deletedAt === null).toArray()
  workouts.sort((a, b) => a.startedAt - b.startedAt)

  const allExercises = await db.exercises.toArray()
  const exMap = new Map(allExercises.map(e => [e.uuid, e.name]))

  const rows: string[] = [`Date,Workout,Exercise,Set #,Weight (${units}),Reps,Type,RPE`]

  for (const w of workouts) {
    const date = new Date(w.startedAt).toISOString().split('T')[0]
    const sets = await db.sets.where('workoutUuid').equals(w.uuid)
      .filter(s => s.deletedAt === null).toArray()
    sets.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
    for (const s of sets) {
      rows.push([
        date,
        esc(w.name),
        esc(exMap.get(s.exerciseUuid) ?? '?'),
        s.setNumber,
        s.weight,
        s.reps,
        s.setType ?? 'normal',
        s.rpe ?? '',
      ].join(','))
    }
  }

  download('gymbro-workouts.csv', rows.join('\n'), 'text/csv')
}

export async function exportRoutinesCsv(): Promise<void> {
  const routines = await db.routines.filter(r => r.deletedAt === null).toArray()
  const allExercises = await db.exercises.toArray()
  const exMap = new Map(allExercises.map(e => [e.uuid, e.name]))

  const rows: string[] = ['Routine,Order,Exercise']
  for (const r of routines) {
    r.exerciseOrder.forEach((uuid, i) => {
      rows.push([esc(r.name), i + 1, esc(exMap.get(uuid) ?? '?')].join(','))
    })
  }

  download('gymbro-routines.csv', rows.join('\n'), 'text/csv')
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
