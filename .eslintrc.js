module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "indent": ["error", 2],
        "linebreak-style": ["error", "windows"],
        "semi": ["error", "always"],
		"brace-style": ["error", "stroustrup"],
		"curly": ["error"]
    }
};