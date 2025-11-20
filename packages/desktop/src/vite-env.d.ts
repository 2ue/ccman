/// <reference types="vite/client" />

// SVG 作为 React 组件导入的类型定义
declare module '*.svg?react' {
  import React from 'react'
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  export default SVGComponent
}
