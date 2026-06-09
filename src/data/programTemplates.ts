// Pre-made program templates. Exercise UUIDs match the deterministic seed IDs.
// On clone, each day becomes a Routine in the user's library.

const sid = (n: number): string =>
  `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`

export interface TemplateDay {
  name: string
  exerciseIds: string[]
  notes?: string
}

export interface ProgramTemplate {
  id: string
  name: string
  description: string
  days: TemplateDay[]
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'stronglifts-5x5',
    name: 'StrongLifts 5×5',
    description: '3 days/week · Barbell compound lifts, linear progression · Best for beginners',
    days: [
      {
        name: 'StrongLifts — Workout A',
        exerciseIds: [sid(69), sid(1), sid(20)],
        notes: '5 sets × 5 reps each. Add 2.5 kg every session.',
      },
      {
        name: 'StrongLifts — Workout B',
        exerciseIds: [sid(69), sid(34), sid(24)],
        notes: 'Squat & OHP: 5×5. Deadlift: 1×5. Add weight every session.',
      },
    ],
  },
  {
    id: 'full-body-3x',
    name: 'Full Body 3×/week',
    description: '3 days/week · Monday / Wednesday / Friday · Great for all levels',
    days: [
      {
        name: 'Full Body',
        exerciseIds: [sid(69), sid(1), sid(20), sid(34), sid(24), sid(45), sid(95)],
        notes: '3–4 sets × 6–12 reps. Rest 2–3 min between compound sets.',
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: '4 days/week · Upper A, Lower A, Upper B, Lower B · Intermediate',
    days: [
      {
        name: 'Upper A',
        exerciseIds: [sid(1), sid(20), sid(2), sid(18), sid(34), sid(45), sid(55)],
        notes: '4 sets × 6–10 reps for compounds; 3 sets × 10–15 for accessories.',
      },
      {
        name: 'Lower A',
        exerciseIds: [sid(69), sid(25), sid(72), sid(80), sid(95)],
        notes: '4 sets × 6–10 for squats, 3 sets × 10–15 for accessories.',
      },
      {
        name: 'Upper B',
        exerciseIds: [sid(2), sid(18), sid(4), sid(19), sid(37), sid(46), sid(57)],
        notes: 'Higher reps (8–15). Focus on mind-muscle connection.',
      },
      {
        name: 'Lower B',
        exerciseIds: [sid(24), sid(72), sid(75), sid(80), sid(87), sid(95)],
        notes: 'Deadlift heavy, then accessory volume.',
      },
    ],
  },
  {
    id: 'push-pull-legs',
    name: 'Push / Pull / Legs',
    description: '6 days/week (or 3) · PPL split · Intermediate to advanced',
    days: [
      {
        name: 'Push',
        exerciseIds: [sid(1), sid(2), sid(9), sid(34), sid(37), sid(58)],
        notes: '3–4 sets each. Start heavy on compounds, higher reps on isolation.',
      },
      {
        name: 'Pull',
        exerciseIds: [sid(24), sid(18), sid(19), sid(23), sid(45), sid(47)],
        notes: '3–4 sets each. Deadlift first, then back, then biceps.',
      },
      {
        name: 'Legs',
        exerciseIds: [sid(69), sid(25), sid(72), sid(80), sid(87), sid(95)],
        notes: '3–4 sets each. Squat first, then posterior chain, then isolation.',
      },
    ],
  },
]
