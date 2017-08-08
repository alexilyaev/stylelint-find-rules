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

/**
 * High resolution timing API
 *
 * @returns {number} High resolution timestamp
 */
function time() {
  const time = process.hrtime();

  return time[0] * 1e3 + time[1] / 1e6;
}

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

/**
 * Handle promise rejections and errors
 */
function handleError(err) {
  let errMsg = err;

  if (err instanceof Object) {
    errMsg = err.message || err.error || JSON.stringify(err);
  }

  printColumns(chalk.red('Error: ' + errMsg));
  printColumns(
    chalk.white(
      "If you can't settle this, please open an issue at:" + EOL + chalk.blue(pkg.bugs.url)
    )
  );
  process.exit(1);
}

/**
 * Print to stdout
 *
 * @param {string} heading
 * @param {Array?} data
 */
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

/**
 * Cache the user config rules into a variable
 * Fail with proper error if no config found
 */
function cacheUserRules(cosmiconfig) {
  if (!cosmiconfig) {
    printColumns(
      chalk.red(
        `Oops, no Stylelint config found, we support cosmiconfig...${EOL}` +
          chalk.blue('https://github.com/davidtheclark/cosmiconfig')
      )
    );

    return process.exit(1);
  }

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
      rule,
      url: chalk.blue(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  printColumns(heading, rulesToPrint);
}

/**
 * Find available stylelint rules that the user hasn't configured yet
 */
function printUnconfiguredRules() {
  const stylelintRulesNoDeprecated = difference(stylelintRulesNames, deprecatedRules);
  const userUnconfigured = difference(stylelintRulesNoDeprecated, userRulesNames);

  if (!userUnconfigured.length) {
    return printColumns(chalk.green('All rules are up-to-date!'));
  }

  const rulesToPrint = userUnconfigured.map(rule => {
    return {
      rule,
      url: chalk.blue(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  const heading = 'The following rules are available but not configured:';

  printColumns(chalk.cyan.underline(heading), rulesToPrint);
}

/**
 * Print how much time it took the tool to run
 */
function printTimingAndExit(startTime) {
  const execTime = time() - startTime;

  printColumns(chalk.green(`Finished in: ${execTime.toFixed()}ms`));
  process.exit(0);
}

/**
 * Hit it
 */
function init() {
  const startTime = time();

  process.on('unhandledRejection', handleError);

  explorer
    .load(process.cwd())
    .then(cacheUserRules)
    .then(printBegin)
    .then(findDeprecatedStylelintRules)
    .then(printUserDeprecated)
    .then(printUnconfiguredRules)
    .then(printTimingAndExit.bind(null, startTime))
    .catch(handleError);
}

init();
