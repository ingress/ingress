import swc from 'vite-plugin-swc-only'

const config = {
  test: {
    include: ['**/*.test.ts'],
    exclude: ['packages/*/node_modules', '**/*.util.test.ts', 'node_modules/**/*'],
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
}

export default config
