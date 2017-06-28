'use strict';

const cosmiconfig = require('cosmiconfig');
const columnify = require('columnify');
const difference = require('lodash.difference');
const stylelint = require('stylelint');

const isDDeprecated = require('./is-deprecated');

const stylelintRules = stylelint.rules;

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
