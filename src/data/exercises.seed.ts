import type { Exercise } from '../types'

// Stable deterministic UUIDs for built-in exercises.
// Pattern: 00000000-0000-4000-a000-{12-digit index}
const id = (n: number): string =>
  `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`

const now = Date.now()

export const EXERCISE_SEED: Exercise[] = [
  // ─── CHEST (12) ──────────────────────────────────────────────────────
  { uuid: id(1),  name: 'Barbell Bench Press',         primaryMuscle: 'chest',      secondaryMuscles: ['triceps', 'shoulders'], equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(2),  name: 'Incline Barbell Bench Press', primaryMuscle: 'chest',      secondaryMuscles: ['triceps', 'shoulders'], equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(3),  name: 'Decline Barbell Bench Press', primaryMuscle: 'chest',      secondaryMuscles: ['triceps'],              equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(4),  name: 'Dumbbell Bench Press',        primaryMuscle: 'chest',      secondaryMuscles: ['triceps', 'shoulders'], equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(5),  name: 'Incline Dumbbell Bench Press',primaryMuscle: 'chest',      secondaryMuscles: ['triceps', 'shoulders'], equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(6),  name: 'Decline Dumbbell Bench Press',primaryMuscle: 'chest',      secondaryMuscles: ['triceps'],              equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(7),  name: 'Dumbbell Flyes',              primaryMuscle: 'chest',      secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(8),  name: 'Incline Dumbbell Flyes',      primaryMuscle: 'chest',      secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(9),  name: 'Cable Crossover',             primaryMuscle: 'chest',      secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(10), name: 'Cable Fly',                   primaryMuscle: 'chest',      secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(11), name: 'Chest Dip',                   primaryMuscle: 'chest',      secondaryMuscles: ['triceps'],              equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(12), name: 'Machine Chest Press',         primaryMuscle: 'chest',      secondaryMuscles: ['triceps'],              equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(13), name: 'Pec Deck',                    primaryMuscle: 'chest',      secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(14), name: 'Push-Up',                     primaryMuscle: 'chest',      secondaryMuscles: ['triceps', 'shoulders'], equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(15), name: 'Smith Machine Bench Press',   primaryMuscle: 'chest',      secondaryMuscles: ['triceps'],              equipment: 'smith',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── BACK (18) ───────────────────────────────────────────────────────
  { uuid: id(16), name: 'Pull-Up',                     primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(17), name: 'Chin-Up',                     primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(18), name: 'Lat Pulldown',                primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(19), name: 'Seated Cable Row',            primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(20), name: 'Bent-Over Barbell Row',       primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(21), name: 'Single-Arm Dumbbell Row',     primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(22), name: 'T-Bar Row',                   primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(23), name: 'Face Pull',                   primaryMuscle: 'back',       secondaryMuscles: ['shoulders'],            equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(24), name: 'Barbell Deadlift',            primaryMuscle: 'back',       secondaryMuscles: ['glutes', 'hamstrings', 'quads'], equipment: 'barbell', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(25), name: 'Romanian Deadlift',           primaryMuscle: 'back',       secondaryMuscles: ['hamstrings', 'glutes'], equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(26), name: 'Good Morning',                primaryMuscle: 'back',       secondaryMuscles: ['hamstrings'],           equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(27), name: 'Back Extension',              primaryMuscle: 'back',       secondaryMuscles: ['glutes'],               equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(28), name: 'Barbell Shrug',               primaryMuscle: 'back',       secondaryMuscles: [],                       equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(29), name: 'Dumbbell Shrug',              primaryMuscle: 'back',       secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(30), name: 'Trap Bar Deadlift',           primaryMuscle: 'back',       secondaryMuscles: ['quads', 'glutes'],      equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(31), name: 'Machine Row',                 primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(32), name: 'Straight-Arm Pulldown',       primaryMuscle: 'back',       secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(33), name: 'Inverted Row',                primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── SHOULDERS (11) ──────────────────────────────────────────────────
  { uuid: id(34), name: 'Barbell Overhead Press',      primaryMuscle: 'shoulders',  secondaryMuscles: ['triceps'],              equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(35), name: 'Dumbbell Shoulder Press',     primaryMuscle: 'shoulders',  secondaryMuscles: ['triceps'],              equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(36), name: 'Arnold Press',                primaryMuscle: 'shoulders',  secondaryMuscles: ['triceps'],              equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(37), name: 'Dumbbell Lateral Raise',      primaryMuscle: 'shoulders',  secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(38), name: 'Cable Lateral Raise',         primaryMuscle: 'shoulders',  secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(39), name: 'Dumbbell Front Raise',        primaryMuscle: 'shoulders',  secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(40), name: 'Rear Delt Dumbbell Flye',     primaryMuscle: 'shoulders',  secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(41), name: 'Reverse Pec Deck',            primaryMuscle: 'shoulders',  secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(42), name: 'Machine Shoulder Press',      primaryMuscle: 'shoulders',  secondaryMuscles: ['triceps'],              equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(43), name: 'Upright Row',                 primaryMuscle: 'shoulders',  secondaryMuscles: ['biceps'],               equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(44), name: 'Smith Machine Overhead Press',primaryMuscle: 'shoulders',  secondaryMuscles: ['triceps'],              equipment: 'smith',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── BICEPS (10) ─────────────────────────────────────────────────────
  { uuid: id(45), name: 'Barbell Curl',                primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(46), name: 'Dumbbell Curl',               primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(47), name: 'Hammer Curl',                 primaryMuscle: 'biceps',     secondaryMuscles: ['forearms'],             equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(48), name: 'Incline Dumbbell Curl',       primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(49), name: 'Concentration Curl',          primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(50), name: 'Cable Curl',                  primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(51), name: 'EZ-Bar Curl',                 primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(52), name: 'Preacher Curl',               primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(53), name: 'Spider Curl',                 primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(54), name: 'Machine Curl',                primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── TRICEPS (9) ─────────────────────────────────────────────────────
  { uuid: id(55), name: 'Close-Grip Bench Press',      primaryMuscle: 'triceps',    secondaryMuscles: ['chest'],                equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(56), name: 'Skull Crusher',               primaryMuscle: 'triceps',    secondaryMuscles: [],                       equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(57), name: 'Tricep Dip',                  primaryMuscle: 'triceps',    secondaryMuscles: ['chest'],                equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(58), name: 'Cable Pushdown (Rope)',        primaryMuscle: 'triceps',    secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(59), name: 'Cable Pushdown (Bar)',         primaryMuscle: 'triceps',    secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(60), name: 'Overhead Tricep Extension',   primaryMuscle: 'triceps',    secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(61), name: 'Tricep Kickback',              primaryMuscle: 'triceps',    secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(62), name: 'Bench Dip',                   primaryMuscle: 'triceps',    secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(63), name: 'Diamond Push-Up',             primaryMuscle: 'triceps',    secondaryMuscles: ['chest'],                equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── FOREARMS (5) ────────────────────────────────────────────────────
  { uuid: id(64), name: 'Barbell Wrist Curl',          primaryMuscle: 'forearms',   secondaryMuscles: [],                       equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(65), name: 'Dumbbell Wrist Curl',         primaryMuscle: 'forearms',   secondaryMuscles: [],                       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(66), name: 'Reverse Barbell Curl',        primaryMuscle: 'forearms',   secondaryMuscles: ['biceps'],               equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(67), name: "Farmer's Walk",               primaryMuscle: 'forearms',   secondaryMuscles: ['back'],                 equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(68), name: 'Behind-the-Back Wrist Curl',  primaryMuscle: 'forearms',   secondaryMuscles: [],                       equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── QUADS (11) ──────────────────────────────────────────────────────
  { uuid: id(69), name: 'Barbell Back Squat',          primaryMuscle: 'quads',      secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(70), name: 'Barbell Front Squat',         primaryMuscle: 'quads',      secondaryMuscles: ['glutes'],               equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(71), name: 'Hack Squat',                  primaryMuscle: 'quads',      secondaryMuscles: ['glutes'],               equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(72), name: 'Leg Press',                   primaryMuscle: 'quads',      secondaryMuscles: ['glutes'],               equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(73), name: 'Leg Extension',               primaryMuscle: 'quads',      secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(74), name: 'Bulgarian Split Squat',       primaryMuscle: 'quads',      secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(75), name: 'Dumbbell Lunge',              primaryMuscle: 'quads',      secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(76), name: 'Barbell Lunge',               primaryMuscle: 'quads',      secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(77), name: 'Step-Up',                     primaryMuscle: 'quads',      secondaryMuscles: ['glutes'],               equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(78), name: 'Goblet Squat',                primaryMuscle: 'quads',      secondaryMuscles: ['glutes'],               equipment: 'kettlebell', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(79), name: 'Smith Machine Squat',         primaryMuscle: 'quads',      secondaryMuscles: ['glutes'],               equipment: 'smith',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── HAMSTRINGS (7) ──────────────────────────────────────────────────
  { uuid: id(80), name: 'Lying Leg Curl',              primaryMuscle: 'hamstrings', secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(81), name: 'Seated Leg Curl',             primaryMuscle: 'hamstrings', secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(82), name: 'Nordic Hamstring Curl',       primaryMuscle: 'hamstrings', secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(83), name: 'Stiff-Leg Deadlift',          primaryMuscle: 'hamstrings', secondaryMuscles: ['back'],                 equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(84), name: 'Single-Leg Romanian Deadlift',primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'],               equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(85), name: 'Cable Pull-Through',          primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'],               equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(86), name: 'Glute-Ham Raise',             primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'],               equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── GLUTES (8) ──────────────────────────────────────────────────────
  { uuid: id(87), name: 'Hip Thrust',                  primaryMuscle: 'glutes',     secondaryMuscles: ['hamstrings'],           equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(88), name: 'Glute Bridge',                primaryMuscle: 'glutes',     secondaryMuscles: ['hamstrings'],           equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(89), name: 'Cable Kickback',              primaryMuscle: 'glutes',     secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(90), name: 'Sumo Deadlift',               primaryMuscle: 'glutes',     secondaryMuscles: ['hamstrings', 'back'],   equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(91), name: 'Clamshell',                   primaryMuscle: 'glutes',     secondaryMuscles: [],                       equipment: 'band',       category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(92), name: 'Hip Abduction Machine',       primaryMuscle: 'glutes',     secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(93), name: 'Donkey Kicks',                primaryMuscle: 'glutes',     secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(94), name: 'Smith Machine Hip Thrust',    primaryMuscle: 'glutes',     secondaryMuscles: ['hamstrings'],           equipment: 'smith',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── CALVES (5) ──────────────────────────────────────────────────────
  { uuid: id(95),  name: 'Standing Calf Raise',        primaryMuscle: 'calves',     secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(96),  name: 'Seated Calf Raise',          primaryMuscle: 'calves',     secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(97),  name: 'Leg Press Calf Raise',       primaryMuscle: 'calves',     secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(98),  name: 'Single-Leg Calf Raise',      primaryMuscle: 'calves',     secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(99),  name: 'Donkey Calf Raise',          primaryMuscle: 'calves',     secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── CORE (14) ───────────────────────────────────────────────────────
  { uuid: id(100), name: 'Plank',                      primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(101), name: 'Side Plank',                 primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(102), name: 'Crunch',                     primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(103), name: 'Bicycle Crunch',             primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(104), name: 'Leg Raise',                  primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(105), name: 'Hanging Leg Raise',          primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(106), name: 'Cable Crunch',               primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(107), name: 'Ab Wheel Rollout',           primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(108), name: 'Russian Twist',              primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(109), name: 'Dead Bug',                   primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(110), name: 'V-Up',                       primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(111), name: 'Dragon Flag',                primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(112), name: 'Hollow Hold',                primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(113), name: 'Pallof Press',               primaryMuscle: 'core',       secondaryMuscles: ['shoulders'],            equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── CARDIO (11) ─────────────────────────────────────────────────────
  { uuid: id(114), name: 'Treadmill Running',          primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'machine',    category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(115), name: 'Stationary Bike',            primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'machine',    category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(116), name: 'Rowing Machine',             primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'machine',    category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(117), name: 'Elliptical',                 primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'machine',    category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(118), name: 'Stair Climber',              primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'machine',    category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(119), name: 'Jump Rope',                  primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'bodyweight', category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(120), name: 'Sprint',                     primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'bodyweight', category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(121), name: 'Burpees',                    primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'bodyweight', category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(122), name: 'Box Jump',                   primaryMuscle: 'cardio',     secondaryMuscles: ['quads', 'glutes'],      equipment: 'bodyweight', category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(123), name: 'Battle Ropes',               primaryMuscle: 'cardio',     secondaryMuscles: ['shoulders'],            equipment: 'bodyweight', category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(124), name: 'Swimming',                   primaryMuscle: 'cardio',     secondaryMuscles: [],                       equipment: 'bodyweight', category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },

  // ─── KETTLEBELL (5) ──────────────────────────────────────────────────
  { uuid: id(125), name: 'Kettlebell Swing',           primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'],       equipment: 'kettlebell', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(126), name: 'Kettlebell Clean',           primaryMuscle: 'shoulders',  secondaryMuscles: ['back'],                 equipment: 'kettlebell', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(127), name: 'Kettlebell Turkish Get-Up',  primaryMuscle: 'core',       secondaryMuscles: ['shoulders'],            equipment: 'kettlebell', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(128), name: 'Kettlebell Romanian Deadlift',primaryMuscle: 'hamstrings',secondaryMuscles: ['glutes'],               equipment: 'kettlebell', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(129), name: 'Kettlebell Press',           primaryMuscle: 'shoulders',  secondaryMuscles: ['triceps'],              equipment: 'kettlebell', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── BAND (5) ────────────────────────────────────────────────────────
  { uuid: id(130), name: 'Band Pull-Apart',            primaryMuscle: 'back',       secondaryMuscles: ['shoulders'],            equipment: 'band',       category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(131), name: 'Resistance Band Squat',      primaryMuscle: 'quads',      secondaryMuscles: ['glutes'],               equipment: 'band',       category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(132), name: 'Resistance Band Curl',       primaryMuscle: 'biceps',     secondaryMuscles: [],                       equipment: 'band',       category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(133), name: 'Resistance Band Row',        primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'band',       category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(134), name: 'Resistance Band Tricep Pushdown', primaryMuscle: 'triceps', secondaryMuscles: [],                     equipment: 'band',       category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },

  // ─── ADDITIONAL / MIXED (16) ──────────────────────────────────────────
  { uuid: id(135), name: 'Seated Dumbbell Overhead Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'],           equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(136), name: 'Single-Arm Cable Row',       primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(137), name: 'Reverse Cable Fly',          primaryMuscle: 'shoulders',  secondaryMuscles: [],                       equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(138), name: 'Hammer Strength Chest Press',primaryMuscle: 'chest',      secondaryMuscles: ['triceps'],              equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(139), name: 'Hammer Strength Row',        primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(140), name: 'Hip Adduction Machine',      primaryMuscle: 'glutes',     secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(141), name: "Captain's Chair Leg Raise",  primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'machine',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(142), name: 'Reverse Crunch',             primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(143), name: 'Wide-Grip Pull-Up',          primaryMuscle: 'back',       secondaryMuscles: ['biceps'],               equipment: 'bodyweight', category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(144), name: 'Smith Machine Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'],          equipment: 'smith',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(145), name: 'Cross-Body Hammer Curl',     primaryMuscle: 'biceps',     secondaryMuscles: ['forearms'],             equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(146), name: 'Mountain Climber',           primaryMuscle: 'core',       secondaryMuscles: [],                       equipment: 'bodyweight', category: 'cardio',   isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(147), name: 'Dumbbell Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'],       equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(148), name: 'Overhead Cable Tricep Extension', primaryMuscle: 'triceps', secondaryMuscles: [],                     equipment: 'cable',      category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(149), name: 'Sumo Squat',                 primaryMuscle: 'glutes',     secondaryMuscles: ['quads', 'hamstrings'],  equipment: 'dumbbell',   category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
  { uuid: id(150), name: 'Box Squat',                  primaryMuscle: 'quads',      secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'barbell',    category: 'strength', isCustom: false, updatedAt: now, deletedAt: null },
]
