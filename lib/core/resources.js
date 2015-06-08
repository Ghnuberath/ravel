'use strict';

/**
 * Simple, recursive directory scanning for resources
 * to make it easier to register lots of them via
 * Ravel.resource
 */

var recursive = require('recursive-readdir');
var fs = require('fs');
var path = require('path');

module.exports = function(Ravel) {

  /**
   * Recursively register resources with Ravel (see core/resource)
   *
   * @param {String} basePath the directory to start scanning recursively for .js files
   */
  Ravel.resources = function(basePath) {
    if (!fs.lstatSync(basePath).isDirectory()) {
      throw new Ravel.ApplicationError.IllegalValue(
        'Base resource scanning path \'' + basePath + '\' is not a directory.');
    } else {
      recursive(basePath, function(err, files) {
        if (err) {
          throw err;
        } else {
          for (var i=0;i<files.length;i++) {
            if (path.extname(files[i]) === '.js') {
              Ravel.resource(files[i]);
            }
          }
        }
      });
    }
  };
};