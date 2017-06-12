#!/usr/bin/env node
'use strict';

const fs = require('fs');
const cosmiconfig = require('cosmiconfig');
const path = require('path');
const readline = require('readline');
const columnify = require('columnify');
const difference = require('lodash.difference');
const stylelintRules = require('stylelint/lib/rules/index');

function handleError(err) {
  throw err;
}

function findUnconfiguredRules(userConfig) {
  const userRulesNames = Object.keys(userConfig);
  const stylelintRulesNames = Object.keys(stylelintRules);

  return difference(stylelintRulesNames, userRulesNames);
}

function buildResults(diff) {
  return diff.map(rule => {
    return isDDeprecated(rule).then(deprecated => {
      return {
        name: rule,
        url: `https://stylelint.io/user-guide/rules/${rule}/`,
        deprecated: deprecated ? 'yes' : ''
      };
    });
  });
}

function isDDeprecated(ruleName, cb) {
  const target = `stylelint/lib/rules/${ruleName}/README.md`;
  const filePath = path.resolve(__dirname, 'node_modules', target);

  // Limit the chunk size to get only the beginning of the file
  const readStream = fs.createReadStream(filePath, { highWaterMark: 1024 });

  readStream.on('error', err => {
    readStream.destroy();

    handleError(err);
  });

  return new Promise(resolve => {
    readStream.on('data', chunk => {
      const text = chunk.toString();

      resolve(/deprecated/i.test(text));

      readStream.destroy();
    });
  });
}

function outputResult(resultsPromises) {
  Promise.all(resultsPromises).then(results => {
    const columns = columnify(results, {});

    process.stdout.write(columns);
    process.exit(0);
  });
}

const explorer = cosmiconfig('stylelint');

explorer
  .load(process.cwd())
  .then(result => result.config.rules)
  .then(findUnconfiguredRules)
  .then(buildResults)
  .then(outputResult)
  .catch(handleError);
