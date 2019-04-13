"use strict";

/* eslint-disable no-magic-numbers */

// Node 8 doesn't emit close upon calling destroy but Node 10 does!
const shouldEmitClose = parseInt(process.versions.node.split(".")[0]) < 10;

/* istanbul ignore next */
const _realEmit = ee => process.nextTick(() => ee.emit("close"));
/* istanbul ignore next */
const _noopEmit = () => undefined;
/* istanbul ignore next */
const emit = shouldEmitClose ? _realEmit : _noopEmit;

module.exports = {
  emit,
  _realEmit,
  _noopEmit
};
