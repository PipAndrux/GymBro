import { ListOrdered } from 'lucide-react'

export default function RoutinesPage() {
  return (
    <div className="page-content">
      <h1 className="page-header">Routines</h1>
      <div className="empty-state">
        <ListOrdered size={40} strokeWidth={1.5} />
        <p>No routines yet. Create one to get started.</p>
      </div>
    </div>
  )
}
