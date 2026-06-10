import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  style?: React.CSSProperties
}

// Ref-counted body lock: keeps `html.sheet-open` set while ANY sheet is open, so
// overlapping/nested sheets don't unlock the page prematurely.
let openSheetCount = 0
function setBodyLock(locked: boolean) {
  if (locked) {
    openSheetCount += 1
    document.documentElement.classList.add('sheet-open')
  } else {
    openSheetCount = Math.max(0, openSheetCount - 1)
    if (openSheetCount === 0) document.documentElement.classList.remove('sheet-open')
  }
}

export default function BottomSheet({ open, onClose, children, title, style }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    setBodyLock(true)
    return () => setBodyLock(false)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={style}
          >
            <div className="sheet-handle" />
            {title && (
              <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>{title}</h2>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
