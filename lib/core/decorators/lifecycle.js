'use strict';

const Metadata = require('../../util/meta');

/**
 * Method-level lifecycle decorators for Module methods,
 * so that they become listeners for Ravel lifecycle events.
 * Made available through the Module class.
 */
module.exports = {
  postinit: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@postinit', key, descriptor.value);
  },
  prelisten: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@prelisten', key, descriptor.value);
  },
  postlisten: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@postlisten', key, descriptor.value);
  },
  preclose: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@preclose', key, descriptor.value);
  }
};