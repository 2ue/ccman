import type { Provider } from '@ccman/types'
import ToolPage from './ToolPage'
import { OpenAIIcon } from './icons/BrandIcons'

interface CodexPageProps {
  providers: Provider[]
  currentProvider?: Provider
  onAdd: () => void
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function CodexPage(props: CodexPageProps) {
  return <ToolPage toolType="codex" toolName="Codex" icon={OpenAIIcon} {...props} />
}
