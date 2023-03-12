import { defineConfig } from 'vite'
import swc from 'vite-plugin-swc-only'

// use all plugins (serve, build, minify)
export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['**/*.util.test.ts', 'node_modules'],
  },
  plugins: [
    swc({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        target: 'es2022',
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
})
