import { Apple } from 'lucide-react'

export default function FoodPage() {
  return (
    <div className="page-content">
      <h1 className="page-header">Food</h1>
      <div className="empty-state">
        <Apple size={40} strokeWidth={1.5} />
        <p>Nothing logged today. Add your first meal.</p>
      </div>
    </div>
  )
}
