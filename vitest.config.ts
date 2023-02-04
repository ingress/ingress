import { defineConfig } from 'vite'
import swc from 'vite-plugin-swc-only'

// use all plugins (serve, build, minify)
export default defineConfig({
  test: {
    exclude: ['**/*.util.test.ts'],
  },
  plugins: [
    swc({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
})
