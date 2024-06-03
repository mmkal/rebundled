const recommendedFlatConfigs = require('eslint-plugin-mmkal').recommendedFlatConfigs

module.exports = [
  ...recommendedFlatConfigs,
  {ignores: ['generated/**']}, //
]
