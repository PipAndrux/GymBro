import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Dumbbell, ListOrdered, Apple, Settings } from 'lucide-react'
import WorkoutPage from './pages/WorkoutPage'
import RoutinesPage from './pages/RoutinesPage'
import FoodPage from './pages/FoodPage'
import ProfilePage from './pages/ProfilePage'
import ExercisesPage from './pages/ExercisesPage'
import SessionPage from './pages/SessionPage'
import RoutineEditPage from './pages/RoutineEditPage'
import HistoryPage from './pages/HistoryPage'
import HistoryDetailPage from './pages/HistoryDetailPage'
import WorkoutSummaryPage from './pages/WorkoutSummaryPage'
import RestTimerBar from './components/RestTimerBar'

// Progress screens pull in recharts (~280KB gzip) — load them on demand so the
// core app and dashboard stay light and start instantly offline.
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const ExerciseProgressPage = lazy(() => import('./pages/ExerciseProgressPage'))
import { useSession } from './store/sessionStore'
import { useSettings } from './lib/settings'

const tabs = [
  { to: '/', label: 'Workout', Icon: Dumbbell },
  { to: '/routines', label: 'Routines', Icon: ListOrdered },
  { to: '/food', label: 'Food', Icon: Apple },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

export default function App() {
  const location = useLocation()
  const { theme } = useSettings()

  // One-time hydration: restore an in-progress workout (if any) after a reload/crash.
  useEffect(() => {
    void useSession.getState().resumeActive()
  }, [])

  // Apply manual theme override to <html> element.
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'system') html.removeAttribute('data-theme')
    else html.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <Suspense fallback={<div className="page-content" />}>
          <Routes location={location}>
            <Route path="/" element={<WorkoutPage />} />
            <Route path="/session" element={<SessionPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/routines" element={<RoutinesPage />} />
            <Route path="/routines/new" element={<RoutineEditPage />} />
            <Route path="/routines/:uuid" element={<RoutineEditPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:uuid" element={<HistoryDetailPage />} />
            <Route path="/summary/:uuid" element={<WorkoutSummaryPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/progress/:exerciseUuid" element={<ExerciseProgressPage />} />
            <Route path="/food" element={<FoodPage />} />
            <Route path="/settings" element={<ProfilePage />} />
          </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <RestTimerBar />

      <nav className="tab-bar">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <div className="tab-icon-wrap">
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
