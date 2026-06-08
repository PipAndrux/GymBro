import { useEffect, lazy, Suspense, useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Dumbbell, ListOrdered, Apple, Settings } from 'lucide-react'
import { useAuth } from './store/authStore'
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
import LandingPage from './pages/LandingPage'

// Progress and measurement screens pull in recharts — load on demand.
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const ExerciseProgressPage = lazy(() => import('./pages/ExerciseProgressPage'))
const MeasurementPage = lazy(() => import('./pages/MeasurementPage'))
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

const ONBOARDED_KEY = 'gymbro_onboarded'

export default function App() {
  const location = useLocation()
  const { theme } = useSettings()
  const initAuth = useAuth(s => s.initialize)
  const { user, initialized } = useAuth()
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem(ONBOARDED_KEY))

  // Mark onboarded when user logs in via the landing page
  useEffect(() => {
    if (user && !onboarded) {
      localStorage.setItem(ONBOARDED_KEY, '1')
      setOnboarded(true)
    }
  }, [user, onboarded])

  useEffect(() => {
    void useSession.getState().resumeActive()
    initAuth()
  }, [initAuth])

  // Apply manual theme override to <html> element.
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'system') html.removeAttribute('data-theme')
    else html.setAttribute('data-theme', theme)
  }, [theme])

  // Show landing page on first visit (auth initialized, not logged in, never dismissed)
  if (initialized && !user && !onboarded) {
    return (
      <LandingPage
        onGuest={() => {
          localStorage.setItem(ONBOARDED_KEY, '1')
          setOnboarded(true)
        }}
      />
    )
  }

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
            <Route path="/measurements/:uuid" element={<MeasurementPage />} />
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
