import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: ['server/vendor/go/wasm_exec.js'],
})
