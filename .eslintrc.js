module.exports = {
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "ignorePatterns": ["**/*.test.html"],
  "env": {
    "browser": false,
    "node": true,
    "es6": true
  },
  "globals": {
    "document": "readonly",
    "window": "readonly",
    "cy": "readonly",
    "Cypress": "readonly",
    "describe": "readonly",
    "it": "readonly",
    "beforeEach": "readonly",
    "expect": "readonly"
  },
  "rules": {
    "no-sequences": "error",
    "no-regex-spaces": "warn",
    "semi": "warn",
    "quotes": [1, "single", { "avoidEscape": true }],
    "prefer-const": "warn",
    "no-unused-vars": "warn"
  }
};