'use strict';

const path = require('path');
const logger = require('gulplog');
const babel = require('babel-core');
const replaceExt = require('replace-ext');
const through = require('@nuintun/through');
const applySourceMap = require('vinyl-sourcemaps-apply');

/**
 * @function replaceExtension
 * @param {string} src
 * @returns {string}
 */
function replaceExtension(src) {
  return path.extname(src) ? replaceExt(src, '.js') : src;
}

/**
 * @exports babel
 * @param {Object} options
 */
module.exports = function(options) {
  options = options || {};

  return through(function(vinyl, enc, next) {
    // Throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // Return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    const relative = vinyl.relative;

    options = Object.assign({}, options, {
      filename: vinyl.path,
      filenameRelative: relative,
      sourceFileName: relative,
      sourceMapTarget: relative,
      sourceMap: Boolean(vinyl.sourceMap)
    });

    const transform = () => {
      const result = babel.transform(vinyl.contents.toString(), options);

      if (result !== null) {
        if (vinyl.sourceMap && result.map) {
          result.map.file = replaceExtension(result.map.file);

          applySourceMap(vinyl, result.map);
        }

        if (!result.ignored) {
          vinyl.contents = new Buffer(result.code);
          vinyl.path = replaceExtension(vinyl.path);
        }

        vinyl.babel = result.metadata;
      }
    };

    try {
      transform();
    } catch (error) {
      logger.error(`Babel`, error.stack);
    }

    this.push(vinyl);

    next();
  });
};
