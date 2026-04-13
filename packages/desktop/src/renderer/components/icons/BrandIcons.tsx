/**
 * 品牌图标组件
 * 使用 @lobehub/icons-static-svg 提供的静态 SVG 图标（无任何依赖）
 */
import ClaudeSvg from '@lobehub/icons-static-svg/icons/claude.svg?react'
import OpenAISvg from '@lobehub/icons-static-svg/icons/openai.svg?react'
import GeminiSvg from '@lobehub/icons-static-svg/icons/gemini.svg?react'
import McpSvg from '@lobehub/icons-static-svg/icons/mcp.svg?react'
import OpenCodeSvg from '@lobehub/icons-static-svg/icons/opencode.svg?react'
import OpenClawSvg from '@lobehub/icons-static-svg/icons/openclaw.svg?react'

interface BrandIconProps {
  className?: string
  size?: number
  style?: React.CSSProperties
}

/**
 * SVG 图标包装组件
 * - 使用 fontSize 控制尺寸（SVG 使用 1em 单位）
 * - 支持 className 和自定义样式
 */
function SvgIcon({
  SvgComponent,
  size = 24,
  className,
  style,
}: BrandIconProps & { SvgComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>> }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size,
        ...style,
      }}
    >
      <SvgComponent />
    </span>
  )
}

export function ClaudeIcon(props: BrandIconProps) {
  return <SvgIcon SvgComponent={ClaudeSvg} {...props} />
}

export function OpenAIIcon(props: BrandIconProps) {
  return <SvgIcon SvgComponent={OpenAISvg} {...props} />
}

export function GeminiIcon(props: BrandIconProps) {
  return <SvgIcon SvgComponent={GeminiSvg} {...props} />
}

export function McpIcon(props: BrandIconProps) {
  return <SvgIcon SvgComponent={McpSvg} {...props} />
}

export function OpenCodeIcon(props: BrandIconProps) {
  return <SvgIcon SvgComponent={OpenCodeSvg} {...props} />
}

export function OpenClawIcon(props: BrandIconProps) {
  return <SvgIcon SvgComponent={OpenClawSvg} {...props} />
}
