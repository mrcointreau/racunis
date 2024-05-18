module.exports = {
  root: true,
  extends: ['@mrcointreau/eslint-config-typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname, // for Zed compatibility
    project: ['./tsconfig.eslint.json'],
  },
  rules: {
    'unicorn/filename-case': [
      'error',
      {
        cases: {
          camelCase: true,
          pascalCase: true,
        },
      },
    ],
  },
  ignorePatterns: [
    '*.min.*',
    '*.d.ts',
    'coverage',
    'dist',
    'docs',
    'package-lock.json',
  ],
}
