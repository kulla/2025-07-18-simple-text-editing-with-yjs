import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

export default defineConfig({
  html: {
    title: 'Simple Text Editing with Yjs',
  },
  output: {
    assetPrefix: '/2025-07-18-simple-text-editing-with-yjs/',
  },
  plugins: [pluginReact()],
})
