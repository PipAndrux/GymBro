import { useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Dumbbell, ListOrdered, Apple, Settings } from 'lucide-react'
import WorkoutPage from './pages/WorkoutPage'
import RoutinesPage from './pages/RoutinesPage'
import FoodPage from './pages/FoodPage'
import ProfilePage from './pages/ProfilePage'
import ExercisesPage from './pages/ExercisesPage'
import SessionPage from './pages/SessionPage'
import RestTimerBar from './components/RestTimerBar'
import { useSession } from './store/sessionStore'

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

  // One-time hydration: restore an in-progress workout (if any) after a reload/crash.
  useEffect(() => {
    void useSession.getState().resumeActive()
  }, [])

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
          <Routes location={location}>
            <Route path="/" element={<WorkoutPage />} />
            <Route path="/session" element={<SessionPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/routines" element={<RoutinesPage />} />
            <Route path="/food" element={<FoodPage />} />
            <Route path="/settings" element={<ProfilePage />} />
          </Routes>
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
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
