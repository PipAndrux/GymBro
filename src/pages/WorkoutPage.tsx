import { Dumbbell } from 'lucide-react'

export default function WorkoutPage() {
  return (
    <div className="page-content">
      <h1 className="page-header">Workout</h1>
      <div className="empty-state">
        <Dumbbell size={40} strokeWidth={1.5} />
        <p>No workouts yet. Start your first session!</p>
      </div>
    </div>
  )
}
