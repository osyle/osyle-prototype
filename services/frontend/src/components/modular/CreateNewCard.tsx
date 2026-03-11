import { Plus } from 'lucide-react'
import React from 'react'

// ============================================================================
// CREATE NEW CARD COMPONENT
// ============================================================================

interface CreateNewCardProps {
  onClick: () => void
}

const CreateNewCard: React.FC<CreateNewCardProps> = ({ onClick }) => {
  return (
    <div
      className="h-full rounded-xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div>
        <div className="text-sm font-medium mb-3" style={{ color: '#3B3B3B' }}>
          Create new
        </div>
        <button
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ backgroundColor: '#F4F4F4' }}
        >
          <Plus size={24} style={{ color: '#929397' }} />
        </button>
      </div>
    </div>
  )
}

export default CreateNewCard
