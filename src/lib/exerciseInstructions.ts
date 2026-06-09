// Short "how to perform" notes keyed by seed exercise UUID.
// Only covers the most common exercises; others get a generic tip.

const sid = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`

interface ExerciseInfo {
  instructions: string
}

export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  // Chest
  [sid(1)]:  { instructions: 'Lie flat on a bench, grip the bar just wider than shoulder-width. Lower to mid-chest with elbows ~45°, press back to lockout. Keep feet flat and back slightly arched.' },
  [sid(2)]:  { instructions: 'Set bench to 30–45°. Grip slightly wider than shoulder-width, lower to upper chest, press up. More upper-chest emphasis than flat bench.' },
  [sid(4)]:  { instructions: 'Lie flat, hold dumbbells above chest. Lower with elbows ~45°, press back up. Greater range of motion than barbell.' },
  [sid(5)]:  { instructions: 'Set bench to 30–45°. Lower dumbbells to upper chest, press up. Keep core braced.' },
  [sid(7)]:  { instructions: 'Lie flat, dumbbells above chest with slight elbow bend. Arc them down and out to a stretch, return to top. This is an isolation move — keep the arc wide.' },
  [sid(9)]:  { instructions: 'Stand between cables set high. Pull handles together in front of lower chest, squeezing the pecs. Keep a slight forward lean.' },
  [sid(11)]: { instructions: 'Lean forward on dip bars for chest emphasis. Lower until shoulders are below elbows, press back up. Keep elbows flared out slightly.' },
  [sid(14)]: { instructions: 'Hands shoulder-width, body in a straight line. Lower chest to just above floor, push back up. Keep core tight throughout.' },

  // Back
  [sid(16)]: { instructions: 'Hang from bar, palms away. Pull chest to bar by driving elbows down and back. Full hang between reps.' },
  [sid(17)]: { instructions: 'Like a pull-up but palms face you. Bicep-dominant. Pull chin over bar, lower fully.' },
  [sid(18)]: { instructions: 'Sit tall, pull bar to upper chest by driving elbows down. Avoid leaning back.' },
  [sid(19)]: { instructions: 'Sit upright, pull handle to abdomen by driving elbows back. Keep chest up.' },
  [sid(20)]: { instructions: 'Hip-hinge until torso is ~45°. Pull bar to lower chest, drive elbows past your body. Keep back flat.' },
  [sid(21)]: { instructions: 'One knee and hand on bench. Pull dumbbell to hip, elbow close to body. Stretch fully at the bottom.' },
  [sid(24)]: { instructions: 'Bar over mid-foot. Hinge to grip, back flat, chest tall. Drive through the floor, then lock hips and knees at top. Lower under control.' },
  [sid(25)]: { instructions: 'Hip-hinge with soft knees, bar close to legs. Lower until you feel hamstring stretch, drive hips forward to stand.' },

  // Shoulders
  [sid(34)]: { instructions: 'Bar in front, grip just outside shoulders. Press overhead to full lockout. Brace core to avoid arching the lower back.' },
  [sid(35)]: { instructions: 'Hold dumbbells at shoulder height. Press overhead, bring slightly together at top. Keep neutral spine.' },
  [sid(37)]: { instructions: 'Slight forward lean, raise dumbbells to shoulder height with elbows slightly bent. Control the descent.' },
  [sid(40)]: { instructions: 'Bend forward or lie on incline bench. Raise dumbbells out to the sides squeezing rear delts. Avoid using momentum.' },

  // Biceps
  [sid(45)]: { instructions: 'Stand upright, grip bar shoulder-width. Curl to chin height, lower fully. Keep elbows fixed at your sides.' },
  [sid(46)]: { instructions: 'Alternate or together. Curl from full extension, supinate (turn) wrist at the top. Controlled descent.' },
  [sid(47)]: { instructions: 'Neutral grip (palms facing each other). Curl straight up. Targets brachialis and brachioradialis as well as biceps.' },

  // Triceps
  [sid(55)]: { instructions: 'Grip the bar narrower than shoulder-width. Lower to lower chest, press back up. Elbows stay in close.' },
  [sid(56)]: { instructions: 'Lie on bench, bar above eyes. Hinge only at the elbows to lower bar to forehead, extend back up.' },
  [sid(57)]: { instructions: 'Lean forward on bars for tricep emphasis. Stay upright. Lower until elbows hit 90°, press back up.' },
  [sid(58)]: { instructions: 'Rope attachment at high pulley. Elbows fixed at sides. Push rope down and flare out at the bottom. Squeeze at full extension.' },
  [sid(60)]: { instructions: 'One dumbbell with both hands behind head. Elbows point up. Extend arms overhead, lower back to stretch.' },

  // Quads
  [sid(69)]: { instructions: 'Bar on traps, stance shoulder-width. Squat to at least parallel — hips below knees. Knees track over toes. Drive through the whole foot to stand.' },
  [sid(70)]: { instructions: 'Bar in front rack. More upright torso than back squat. Elbows high throughout. Squat to depth.' },
  [sid(72)]: { instructions: 'Feet shoulder-width on platform. Lower until 90°, press back. Adjust foot placement for more quad or glute emphasis.' },
  [sid(73)]: { instructions: 'Seated, hook ankles under pad. Extend legs fully, squeeze quads at top. Lower under control — don\'t let weight crash.' },
  [sid(74)]: { instructions: 'Rear foot elevated on bench. Lower front knee to floor, keeping torso upright. Excellent unilateral quad and glute developer.' },
  [sid(75)]: { instructions: 'Step forward into a lunge, knee tracks over toes. Push off front foot to return. Alternate legs.' },

  // Hamstrings
  [sid(80)]: { instructions: 'Lie face-down, hook ankles under pad. Curl heels to glutes, squeeze at top. Lower fully.' },
  [sid(83)]: { instructions: 'Straight-leg deadlift variation. Keep legs mostly straight, hinge until you feel hamstring stretch. Back flat.' },
  [sid(25)]: { instructions: 'Hip-hinge with soft knees, bar close to legs. Lower until hamstrings are fully stretched, drive hips forward to return.' },

  // Glutes
  [sid(87)]: { instructions: 'Upper back on bench, bar on hip crease. Drive hips up by squeezing glutes. Full hip extension at top, don\'t hyperextend the lower back.' },
  [sid(88)]: { instructions: 'Lie on back, feet flat. Drive hips up squeezing glutes. Hold 1 second at top.' },
  [sid(90)]: { instructions: 'Like a conventional deadlift but with a wide stance and toes out. Glute and inner-thigh focus.' },

  // Calves
  [sid(95)]: { instructions: 'Full range of motion is key. Lower heel below platform level for a full stretch, rise onto tiptoe and pause. Don\'t bounce.' },
  [sid(96)]: { instructions: 'Seated targets the soleus more than standing. Slow, full-range reps.' },

  // Core
  [sid(100)]: { instructions: 'Forearms on floor, body in a straight line from head to heels. Brace as if absorbing a punch. Breathe steadily.' },
  [sid(104)]: { instructions: 'Lie flat, hands under hips. Raise legs to 90°, lower slowly without touching the floor. Keep lower back pressed down.' },
  [sid(105)]: { instructions: 'Hang from bar. Raise legs to parallel (or higher). Control the descent to avoid swinging.' },
  [sid(107)]: { instructions: 'From knees, roll wheel out until almost fully extended, pull back. Keep core braced the entire time — a very demanding move.' },
}

export function getExerciseInfo(uuid: string): ExerciseInfo | null {
  return EXERCISE_INFO[uuid] ?? null
}
