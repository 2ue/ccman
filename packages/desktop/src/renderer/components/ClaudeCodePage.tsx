import type { Provider } from '@ccman/types'
import ToolPage from './ToolPage'
import { ClaudeIcon } from './icons/BrandIcons'

interface ClaudeCodePageProps {
  providers: Provider[]
  currentProvider?: Provider
  onAdd: () => void
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function ClaudeCodePage(props: ClaudeCodePageProps) {
  return <ToolPage toolType="claude" toolName="Claude Code" icon={ClaudeIcon} {...props} />
}
