stylelint-find-rules
======================

[![version](https://img.shields.io/npm/v/stylelint-find-rules.svg?style=flat-square)](http://npm.im/stylelint-find-rules)
[![MIT License](https://img.shields.io/npm/l/stylelint-find-rules.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

Find [Stylelint](https://github.com/stylelint/stylelint) rules that are not configured in your Stylelint config.

> Inspired by [eslint-find-rules](https://github.com/sarbbottam/eslint-find-rules)

Installation
-------------

Install as a dev dependency of your project:

```
yarn add -D stylelint-find-rules
```

Or with `npm`

```
npm i -D stylelint-find-rules
```

Usage
------

This package requires `stylelint` to be installed in the project, as it will search available rules
from that package.

### npm script

```
{
  ...
  "scripts": {
    "stylelint-find-unused-rules": "stylelint-find-rules"
  }
  ...
}
```

### Command line

```
./node_modules/.bin/stylelint-find-rules
```

Supported configs
------------------

Just like Stylelint, this package uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig)
to find your config data, so if Stylelint works for you, this should too.
