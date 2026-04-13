import type { Provider } from '@ccman/types'
import ToolPage from './ToolPage'
import { GeminiIcon } from './icons/BrandIcons'

interface GeminiPageProps {
  providers: Provider[]
  currentProvider?: Provider
  onAdd: () => void
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function GeminiPage(props: GeminiPageProps) {
  return <ToolPage toolType="gemini" toolName="Gemini CLI" icon={GeminiIcon} {...props} />
}
