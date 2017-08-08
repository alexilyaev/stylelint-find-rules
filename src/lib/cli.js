'use strict';

const cosmiconfig = require('cosmiconfig');
const columnify = require('columnify');
const difference = require('lodash.difference');
const intersection = require('lodash.intersection');
const stylelint = require('stylelint');
const chalk = require('chalk');
const EOL = require('os').EOL;
const pkg = require('../../package.json');

const isDDeprecated = require('./is-deprecated');

const explorer = cosmiconfig('stylelint');

const stylelintRulesNames = Object.keys(stylelint.rules);
let deprecatedRules = [];
let userRulesNames = [];

// const options = {
//   getCurrentRules: ['current', 'c'],
//   getPluginRules: ['plugin', 'p'],
//   getAllAvailableRules: ['all-available', 'a'],
//   getUnusedRules: ['unused', 'u'],
//   n: [],
//   error: ['error'],
//   core: ['core'],
//   verbose: ['verbose', 'v']
// };
//
// const argv = require('yargs')
//   .boolean(Object.keys(options))
//   .alias(options)
//   .option('include', {
//     alias: 'i',
//     choices: ['deprecated'],
//     type: 'string'
//   })
//   .default('error', true)
//   .default('core', true)
//   .help().argv;

function handleError(err) {
  throw err;
}

function printColumns(heading, data) {
  const columns = columnify(data, {});
  const spacer = EOL + EOL;

  process.stdout.write(heading);
  process.stdout.write(spacer);

  if (columns) {
    process.stdout.write(columns);
    process.stdout.write(spacer);
  }
}

function cacheUserRules(cosmiconfig) {
  userRulesNames = Object.keys(cosmiconfig.config.rules);
}

/**
 * Find all deprecated rules from the list of Stylelint rules
 *
 * @returns {Promise}
 */
function findDeprecatedStylelintRules() {
  const isDeprecatedPromises = stylelintRulesNames.map(isDDeprecated);

  return Promise.all(isDeprecatedPromises).then(rulesIsDeprecated => {
    deprecatedRules = stylelintRulesNames.filter((rule, index) => rulesIsDeprecated[index]);

    return deprecatedRules;
  });
}

/**
 * Print a nice header
 */
function printBegin() {
  printColumns(chalk.whiteBright.bold(`stylelint-find-rules v${pkg.version}`));
}

/**
 * Find user configured rules that are deprecated
 */
function printUserDeprecated() {
  const userDeprecated = intersection(deprecatedRules, userRulesNames);

  if (!userDeprecated.length) {
    return;
  }

  const heading = chalk.red.underline('The following configured rules are DEPRECATED:');
  const rulesToPrint = userDeprecated.map(rule => {
    return {
      rule: chalk.dim(rule),
      url: chalk.dim(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  printColumns(heading, rulesToPrint);
  // process.exit(1);
}

/**
 * Find available stylelint rules that the user hasn't configured yet
 */
function printUnconfiguredRules() {
  const stylelintRulesNoDeprecated = difference(stylelintRulesNames, deprecatedRules);
  const userUnconfigured = difference(stylelintRulesNoDeprecated, userRulesNames);

  if (!userUnconfigured.length) {
    printColumns(chalk.green('All rules are up-to-date!'));

    return process.exit(0);
  }

  const rulesToPrint = userUnconfigured.map(rule => {
    return {
      rule: chalk.dim(rule),
      url: chalk.dim(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  const heading = 'The following rules are available but not configured:';

  printColumns(chalk.cyan.underline(heading), rulesToPrint);
  process.exit(0);
}

explorer
  .load(process.cwd())
  .then(cacheUserRules)
  .then(findDeprecatedStylelintRules)
  .then(printBegin)
  .then(printUserDeprecated)
  .then(printUnconfiguredRules)
  .catch(handleError);
