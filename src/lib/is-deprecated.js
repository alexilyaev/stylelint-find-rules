'use strict';

const path = require('path');
const fs = require('fs');

function handleError(err) {
  throw err;
}

module.exports = function isDDeprecated(ruleName) {
  const target = `stylelint/lib/rules/${ruleName}/README.md`;
  const filePath = path.resolve(process.cwd(), 'node_modules', target);

  // Limit the chunk size to get only the beginning of the file
  const readStream = fs.createReadStream(filePath, {
    highWaterMark: 1024
  });

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
};
