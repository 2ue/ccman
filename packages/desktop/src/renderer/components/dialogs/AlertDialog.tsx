import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

interface AlertDialogProps {
  show: boolean
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  confirmText?: string
  onClose: () => void
}

export default function AlertDialog({
  show,
  title,
  message,
  type = 'info',
  confirmText = '确定',
  onClose,
}: AlertDialogProps) {
  if (!show) return null

  const iconMap = {
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <XCircle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">{iconMap[type]}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 break-all whitespace-pre-wrap">{message}</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
