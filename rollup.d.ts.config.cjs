const dts = require('rollup-plugin-dts').default;

module.exports = {
  input: 'dist/tmp/router.d.ts',
  output: {
    file: 'dist/router.d.ts',
    format: 'es'
  },
  plugins: [dts()]
};