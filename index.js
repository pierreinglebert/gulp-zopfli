'use strict';

var through2    = require('through2');
var PluginError = require('plugin-error');
var bufferMode  = require('./lib/buffer');
var streamMode  = require('./lib/stream');
var defaults = require('defaults');
var bytes = require('bytes');

var PLUGIN_NAME = 'gulp-zopfli';

/**
 *
 * @param {Object} opts
 * @param {String} opts.format gzip || deflate || zlib
 * @param {Number} opts.thresholdRatio if compression ratio does not reach the threshold,
 * does not compress, default to 0
 * @param {String} opts.thresholdBehavior if compression ratio does not reach the threshold,
 * "original" to output original file, or
 * "blank" (default) to output nothing
 * @returns {Stream}
 */
module.exports = function(options) {

  options = options || {};
  defaults(options, {
    format: 'gzip',
    append: true,
    threshold: false,
    zopfliOptions: {}
  });
  if(options.threshold) {
    if(typeof options.threshold != 'number') {
      if(typeof options.threshold == 'string') {
        options.threshold = bytes(options.threshold) || 150;
      } else {
        options.threshold = 150;
      }
    }
    options.threshold = Math.max(1, options.threshold);
  }

  var ext = '';
  if(options.append) {
    if(options.format === 'gzip') {
      ext = '.gz';
    } else if(options.format === 'deflate') {
      ext = '.deflate';
    } else if(options.format === 'zlib') {
      ext = '.zz';
    }
  }

  var stream = through2.obj(compress);
  stream.options = options;

  function compress(file, enc, done) {

    /*jshint validthis: true */
    var self = this;

    // Check for empty file
    if (file.isNull()) {
      // Pass along the empty file to the next plugin
      this.push(file);
      done();
      return;
    }

    // Call when finished with compression
    var finished = function(err, contents, wasCompressed) {
      if (err) {
        var error = new PluginError(PLUGIN_NAME, err, { showStack: true });
        self.emit('error', error);
        done();
        return;
      }
      if (options.append && wasCompressed) file.path += ext;
      file.contents = contents;
      self.push(file);
      done();
      return;
    };

    // Check if file contents is a buffer or a stream
    if(file.isBuffer()) {
      bufferMode(file.contents, options, finished);
    } else {
      streamMode(file.contents, options, finished);
    }
  }

  return stream;
};
