"use strict";

const { Readable } = require("stream");

const isReadable = x => Boolean(x && x.pipe && x.on && x._readableState);

class Munchy extends Readable {
  constructor(opts, ...sources) {
    super(opts);
    this._resetSources(sources);
    this._error = null;
    this._startRead();
  }

  _startRead() {
    if (
      this._currentStream === null &&
      this._sources.length > 0 &&
      this._sources.length > this._index
    ) {
      process.nextTick(() => this._read());
    }
  }

  _resetSources(sources = []) {
    this._index = 0;
    this._sources = sources;
    this._currentStream = null;
  }

  destroy() {
    this._resetSources();
    super.destroy();
  }

  _read() {
    if (this.destroyed) {
      this.emit("error", new Error("munchy _read called after destroy"));
      return;
    } else if (this._currentStream) {
      return;
    }

    for (; this._index < this._sources.length; this._index++) {
      const source = this._sources[this._index];
      if (source === null) {
        this.push(null);
        this.destroy();
        break;
      } else if (isReadable(source)) {
        this._setupStream(source);
        break;
      } else {
        this.push(source);
      }
    }

    if (this._index >= this._sources.length) {
      this._resetSources();
    }
  }

  _nextSource() {
    this._currentStream = null;
    this._index++;
    this._read();
  }

  _setupStream(stream) {
    this._currentStream = stream;

    let remove; // eslint-disable-line prefer-const

    const onData = data => {
      this.push(data);
    };

    const onEnd = err => {
      remove();
      this._error = err;
      if (!err) {
        this._nextSource();
      } else {
        this.emit("error", err);
        this.destroy();
      }
    };

    const onError = err => {
      onEnd(err || new Error("munchy - source stream emitted error"));
    };

    stream.on("data", onData);
    stream.once("error", onError);
    stream.once("end", onEnd);

    remove = () => {
      stream.removeListener("data", onData);
      stream.removeListener("error", onError);
      stream.removeListener("end", onEnd);
    };

    this.emit("draining", { stream });
  }

  munch(...sources) {
    for (const source of sources) {
      this._sources.push(source);
    }
    this._startRead();
    return this;
  }
}

module.exports = Munchy;
