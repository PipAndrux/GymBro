import { Settings } from 'lucide-react'

export default function ProfilePage() {
  return (
    <div className="page-content">
      <h1 className="page-header">Settings</h1>
      <div className="empty-state">
        <Settings size={40} strokeWidth={1.5} />
        <p>Settings and data export coming soon.</p>
      </div>
    </div>
  )
}
