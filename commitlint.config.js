module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // Feature related changes
        'fix', // Code patches
        'perf', // A code change that improves performance

        'chore', // Other changes that don't modify src or test files
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'style', // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
        'test', // Adding missing tests or correcting existing tests
        'revert', // Reverts a previous commit

        'docs', // Documentation only changes

        'ui', // UI-related changes

        'build', // Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
      ],
    ],
  },
};
