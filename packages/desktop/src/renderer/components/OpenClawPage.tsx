import type { Provider } from '@ccman/types'
import ToolPage from './ToolPage'
import { OpenClawIcon } from './icons/BrandIcons'

interface OpenClawPageProps {
  providers: Provider[]
  currentProvider?: Provider
  onAdd: () => void
  onSwitch: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string, name: string) => void
  onClone: (provider: Provider) => void
}

export default function OpenClawPage(props: OpenClawPageProps) {
  return <ToolPage toolType="openclaw" toolName="OpenClaw" icon={OpenClawIcon} {...props} />
}
