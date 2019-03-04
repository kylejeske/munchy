"use strict";

const Munchy = require("../..");
const fs = require("fs");
const { PassThrough } = require("stream");
const { asyncVerify, expectError } = require("run-verify");

describe("munchy", function() {
  const drainIt = munchy => {
    const data = [];
    const drain = new PassThrough();
    drain.on("data", x => data.push(x));
    munchy.pipe(drain);
    return { data, drain };
  };

  it("should drain fs read stream, string, and buffer", () => {
    const munchy = new Munchy(
      {},
      `hello world\n`,
      fs.createReadStream("test/fixtures/foo.txt"),
      Buffer.from(`blah`),
      fs.createReadStream("test/fixtures/bar.txt"),
      null
    );

    const { data } = drainIt(munchy);
    let end;

    munchy.on("end", () => {
      end = true;
    });

    return asyncVerify(
      next => munchy.on("close", next),
      () => {
        expect(end, "didn't get end event before close event").to.be.true;
        const output = data.map(x => x.toString());
        expect(output).to.deep.equal(["hello world\n", "foo\n", "blah", "bar\n"]);
      }
    );
  });

  it("should initialize sources to []", () => {
    const munchy = new Munchy();
    expect(munchy._sources).to.deep.equal([]);
  });

  it("should reset sources if they are all drained", () => {
    const foo = fs.createReadStream("test/fixtures/foo.txt");
    const bar = fs.createReadStream("test/fixtures/bar.txt");
    const munchy = new Munchy({}, "hello", "world", foo);

    const { data } = drainIt(munchy);

    return asyncVerify(
      next => foo.on("end", next),
      () => munchy.munch(fs.createReadStream("test/fixtures/foo.txt"), bar),
      next => bar.on("end", next),
      () => munchy.munch(null),
      next => munchy.on("end", next),
      () => {
        expect(data.map(x => x.toString().trim()).join("")).to.equal("helloworldfoofoobar");
      }
    );
  });

  it("should throw if trying to read after destroy", () => {
    const munchy = new Munchy({}, "hello", "world", null);
    drainIt(munchy);
    return asyncVerify(
      next => munchy.on("end", next),
      () => {
        expect(() => munchy.munch("test")).to.throw("called after destroy");
      }
    );
  });

  it("should error if a source stream error", () => {
    const munchy = new Munchy();

    const p = new PassThrough();
    drainIt(munchy);
    munchy.munch(p);
    return asyncVerify(
      expectError(next => {
        munchy.on("error", next);
        p.emit("error", new Error("test"));
      }),
      err => {
        expect(err.message).to.equal("test");
      }
    );
  });
});
