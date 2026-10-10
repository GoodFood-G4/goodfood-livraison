module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Le domaine est du TypeScript pur : aucune dépendance à un framework ou à une infrastructure.
      files: ['src/**/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '@nestjs/*',
              'typeorm',
              'amqplib',
              'amqp-connection-manager',
              'pg',
              'class-validator',
              'class-transformer',
              'express',
            ],
          },
        ],
      },
    },
    {
      // L'application orchestre le domaine via des ports ; seul le DI minimal de Nest est toléré.
      files: ['src/**/application/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: ['typeorm', 'amqplib', 'amqp-connection-manager', 'express', 'pg'],
          },
        ],
      },
    },
  ],
};
