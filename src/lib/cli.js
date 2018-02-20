'use strict';

const _ = require('lodash');
const cosmiconfig = require('cosmiconfig');
const columnify = require('columnify');
const stylelint = require('stylelint');
const chalk = require('chalk');
const yargs = require('yargs');
const Promise = require('bluebird');
const EOL = require('os').EOL;

const pkg = require('../../package.json');
const isDDeprecated = require('./is-deprecated');

const rules = {
  stylelintAll: _.keys(stylelint.rules),
  stylelintDeprecated: [],
  stylelintNoDeprecated: [],
  userRulesNames: []
};

/**
 * Define command line arguments
 */
const argv = yargs
  .usage('stylelint-find-rules [options]')
  .example('stylelint-find-rules')
  .example('stylelint-find-rules --no-d --no-i')
  .example('stylelint-find-rules --config path/to/custom.config.js')
  .option('u', {
    type: 'boolean',
    alias: 'unused',
    describe: `Find available rules that are not configured
               To disable, set to ${chalk.blue('false')} or use ${chalk.blue('--no-u')}`,
    default: true
  })
  .option('d', {
    type: 'boolean',
    alias: 'deprecated',
    describe: `Find deprecated configured rules
               To disable, set to ${chalk.blue('false')} or use ${chalk.blue('--no-d')}`,
    default: true
  })
  .option('i', {
    type: 'boolean',
    alias: 'invalid',
    describe: `Find configured rules that are no longer available
               To disable, set to ${chalk.blue('false')} or use ${chalk.blue('--no-i')}`,
    default: true
  })
  .option('c', {
    type: 'boolean',
    alias: 'current',
    describe: 'Find all currently configured rules'
  })
  .option('a', {
    type: 'boolean',
    alias: 'available',
    describe: 'Find all available stylelint rules'
  })
  .option('config', {
    describe: 'Optional, path to a custom config file (passed as `configPath` to cosmiconfig)'
  })
  .help('h')
  .alias('h', 'help')
  .group(['help', 'config'], 'General:')
  .wrap(100).argv;

/**
 * High resolution timing API
 *
 * @returns {number} High resolution timestamp
 */
function time() {
  const time = process.hrtime();

  return time[0] * 1e3 + time[1] / 1e6;
}

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
      "If you can't settle this, please open an issue at:" + EOL + chalk.cyan(pkg.bugs.url)
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
 * Check we got everything we need:
 * - stylelint config (by comiconfig)
 * - CLI arguments
 */
function validate(cosmiconfig) {
  if (!cosmiconfig) {
    printColumns(
      chalk.red(
        `Oops, no stylelint config found, we support cosmiconfig...${EOL}` +
          chalk.cyan('https://github.com/davidtheclark/cosmiconfig')
      )
    );

    return process.exit(1);
  }

  if (!argv.unused && !argv.deprecated && !argv.current && !argv.available) {
    printColumns(chalk.red(`Oops, one of the command line Options must be set...${EOL}`));
    yargs.showHelp();

    return process.exit(1);
  }

  return cosmiconfig.config;
}

/**
 * Get user rules
 * Gather rules from `extends` as well
 */
function getUserRules(config) {
  let rulesNames = _.keys(config.rules);

  // Handle extends
  if (config.extends) {
    const normalizedExtends = _.isArray(config.extends) ? config.extends : [config.extends];

    _.forEach(normalizedExtends, extendName => {
      // Get the `extends` config file
      const configData = require(extendName);
      const extendRulesNames = _.keys(configData.rules);

      rulesNames = rulesNames.concat(extendRulesNames);
    });
  }

  rules.userRulesNames = _.sortedUniq(rulesNames);
}

/**
 * Find all deprecated rules from the list of stylelint rules
 *
 * @returns {Promise}
 */
function findDeprecatedStylelintRules() {
  if (!argv.deprecated && !argv.unused) {
    return Promise.resolve();
  }

  const isDeprecatedPromises = _.map(rules.stylelintAll, isDDeprecated);

  return Promise.all(isDeprecatedPromises).then(rulesIsDeprecated => {
    rules.stylelintDeprecated = _.filter(
      rules.stylelintAll,
      (rule, index) => rulesIsDeprecated[index]
    );

    // Don't remove, just for testing deprecated rules matching
    if (argv.testDeprecated) {
      rules.stylelintDeprecated.push('color-hex-case', 'color-hex-length');
    }

    if (argv.unused) {
      rules.stylelintNoDeprecated = _.difference(rules.stylelintAll, rules.stylelintDeprecated);
    }

    return rules.stylelintDeprecated;
  });
}

/**
 * Print a nice header
 */
function printBegin() {
  printColumns(chalk.whiteBright.bold(`stylelint-find-rules v${pkg.version}`));
}

/**
 * Print currently configured rules
 */
function printUserCurrent() {
  if (!argv.current) {
    return;
  }

  const heading = chalk.blue.underline('CURRENT: Currently configured user rules:');
  const rulesToPrint = _.map(rules.userRulesNames, rule => {
    return {
      rule,
      url: chalk.cyan(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  printColumns(heading, rulesToPrint);
}

/**
 * Print all available stylelint rules
 */
function printAllAvailable() {
  if (!argv.available) {
    return;
  }

  const heading = chalk.blue.underline('AVAILABLE: All available stylelint rules:');
  const rulesToPrint = _.map(rules.stylelintAll, rule => {
    return {
      rule,
      url: chalk.cyan(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  printColumns(heading, rulesToPrint);
}

/**
 * Print configured rules that are no longer available
 */
function printConfiguredUnavailable() {
  if (!argv.invalid) {
    return;
  }

  const configuredUnavailable = _.difference(rules.userRulesNames, rules.stylelintAll);

  if (!configuredUnavailable.length) {
    return;
  }

  const heading = chalk.red.underline('INVALID: Configured rules that are no longer available:');
  const rulesToPrint = _.map(configuredUnavailable, rule => {
    return {
      rule: chalk.redBright(rule)
    };
  });

  printColumns(heading, rulesToPrint);
}

/**
 * Print user configured rules that are deprecated
 */
function printUserDeprecated() {
  if (!argv.deprecated) {
    return;
  }

  const userDeprecated = _.intersection(rules.stylelintDeprecated, rules.userRulesNames);

  if (!userDeprecated.length) {
    return;
  }

  const heading = chalk.red.underline('DEPRECATED: Configured rules that are deprecated:');
  const rulesToPrint = _.map(userDeprecated, rule => {
    return {
      rule: chalk.redBright(rule),
      url: chalk.cyan(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  printColumns(heading, rulesToPrint);
}

/**
 * Print available stylelint rules that the user hasn't configured yet
 */
function printUserUnused() {
  if (!argv.unused) {
    return;
  }

  const userUnconfigured = _.difference(rules.stylelintNoDeprecated, rules.userRulesNames);
  let heading;

  if (!userUnconfigured.length) {
    heading = chalk.green('All rules are up-to-date!');
    printColumns(heading);

    return;
  }

  const rulesToPrint = _.map(userUnconfigured, rule => {
    return {
      rule,
      url: chalk.cyan(`https://stylelint.io/user-guide/rules/${rule}/`)
    };
  });

  heading = chalk.blue.underline('UNUSED: Available rules that are not configured:');

  printColumns(heading, rulesToPrint);
}

/**
 * Print how long it took the tool to execute
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
  const cosmicOpts = {};

  process.on('unhandledRejection', handleError);

  // cosmiconfig no longer supports --config flag
  if (argv.config) {
    cosmicOpts.configPath = argv.config;
  }

  const explorer = cosmiconfig('stylelint', cosmicOpts);

  explorer
    // Ref: https://github.com/davidtheclark/cosmiconfig#loadsearchpath-configpath
    .load(process.cwd())
    .then(validate)
    .then(getUserRules)
    .then(findDeprecatedStylelintRules)
    .then(printBegin)
    .then(printUserCurrent)
    .then(printAllAvailable)
    .then(printUserUnused)
    .then(printUserDeprecated)
    .then(printConfiguredUnavailable)
    .then(printTimingAndExit.bind(null, startTime))
    .catch(handleError);
}

init();
