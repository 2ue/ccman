import { Plus } from 'lucide-react'

interface Props {
  onAddClick: () => void
}

export default function Header({ onAddClick }: Props) {
  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">CM</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">ccman</h1>
      </div>

      <button
        onClick={onAddClick}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
      >
        <Plus className="w-4 h-4" />
        Add Provider
      </button>
    </header>
  )
}
