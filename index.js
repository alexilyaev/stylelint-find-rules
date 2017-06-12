#!/usr/bin/env node
'use strict';

const fs = require('fs');
const rc = require('rc');
const path = require('path');
const readline = require('readline');
const columnify = require('columnify');
const difference = require('lodash.difference');
const stylelintRules = require('stylelint/lib/rules/index');

const userConfig = rc('stylelint');

const userRulesNames = Object.keys(userConfig.rules);
const stylelintRulesNames = Object.keys(stylelintRules);

const diff = difference(stylelintRulesNames, userRulesNames);

function isDDeprecated(ruleName, cb) {
  const target = `stylelint/lib/rules/${ruleName}/README.md`;
  const filePath = path.resolve(__dirname, 'node_modules', target);

  // Limit the chunk size to get only the beginning of the file
  const readStream = fs.createReadStream(filePath, { highWaterMark: 1024 });

  readStream.on('error', err => {
    readStream.destroy();

    throw err;
  });

  return new Promise(resolve => {
    readStream.on('data', chunk => {
      const text = chunk.toString();

      resolve(/deprecated/i.test(text));

      readStream.destroy();
    });
  });
}

const resultsPromises = diff.map(rule => {
  return isDDeprecated(rule).then(deprecated => {
    return {
      name: rule,
      url: `https://stylelint.io/user-guide/rules/${rule}/`,
      deprecated: deprecated ? 'yes' : ''
    };
  });
});

Promise.all(resultsPromises).then(results => {
  const columns = columnify(results, {});

  process.stdout.write(columns);
  process.exit(0);
});
