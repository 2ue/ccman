import type { Provider } from '@ccman/types'
import ToolPage from './ToolPage'
import { OpenCodeIcon } from './icons/BrandIcons'

interface OpenCodePageProps {
  providers: Provider[]
  currentProvider?: Provider
  onAdd: () => void
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function OpenCodePage(props: OpenCodePageProps) {
  return <ToolPage toolType="opencode" toolName="OpenCode" icon={OpenCodeIcon} {...props} />
}
