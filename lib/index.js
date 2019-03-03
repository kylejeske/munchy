"use strict";

const { Readable } = require("stream");

const isReadable = x => Boolean(x && x.pipe && x.on && x._readableState);

class Munchy extends Readable {
  constructor(opts, ...sources) {
    super(opts);
    this._index = 0;
    this._sources = sources;
    this._currentStream = null;
    this._error = null;
    if (sources.length > this._index) {
      process.nextTick(() => this._read());
    }
  }

  _resetSources() {
    this._index = 0;
    this._sources = [];
  }

  destroy() {
    this._resetSources();
    super.destroy();
  }

  _read() {
    if (this.destroyed) {
      throw new Error("munchy _read called after destroy");
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
    if (this._currentStream === stream) return;

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
      }
    };

    const onError = err => onEnd(err);

    stream.on("data", onData);
    stream.once("error", onError);
    stream.once("end", onEnd);

    remove = () => {
      stream.removeListener("data", onData);
      stream.removeListener("error", onError);
      stream.removeListener("end", onEnd);
    };
  }

  munch(...sources) {
    for (const source of sources) {
      this._sources.push(source);
    }
    this._read();
  }
}

module.exports = Munchy;
