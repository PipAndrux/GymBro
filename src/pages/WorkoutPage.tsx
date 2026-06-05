import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen } from 'lucide-react'

export default function WorkoutPage() {
  const navigate = useNavigate()

  return (
    <div className="page-content">
      <h1 className="page-header">Workout</h1>

      {/* Start Workout — Phase 3 */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: 17, borderRadius: 'var(--radius-lg)' }}
          disabled
          title="Coming in Phase 3"
        >
          <Plus size={20} />
          Start Single Workout
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 6 }}>
          Live workout sessions — coming next
        </p>
      </div>

      {/* Exercise Library link */}
      <div style={{ padding: '0 16px' }}>
        <p className="section-title" style={{ padding: 0, marginBottom: 8 }}>Library</p>
        <button
          className="card"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            border: 'none',
            textAlign: 'left',
          }}
          onClick={() => navigate('/exercises')}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99 102 241 / 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BookOpen size={22} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Exercise Library</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Browse, search and add custom exercises
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
