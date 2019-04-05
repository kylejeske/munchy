"use strict";

const Munchy = require("../..");
const fs = require("fs");
const { PassThrough } = require("stream");
const { asyncVerify, expectErrorHas, expectErrorToBe } = require("run-verify");

describe("munchy", function() {
  const drainIt = munchy => {
    const data = [];
    const drain = new PassThrough();
    drain.on("data", x => {
      data.push(x);
    });
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
    let drained = 0;

    munchy.on("end", () => {
      end = true;
    });
    munchy.on("drained", () => {
      drained++;
    });

    return asyncVerify(
      next => munchy.on("close", next),
      () => {
        expect(end, "didn't get end event before close event").to.be.true;
        const output = data.map(x => x.toString());
        expect(output).to.deep.equal(["hello world\n", "foo\n", "blah", "bar\n"]);
        // should've emitted drained for two stream
        expect(drained).to.equal(2);
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

    let munched = false;
    munchy.once("munched", () => {
      munched = true;
    });
    const { data } = drainIt(munchy);

    return asyncVerify(
      next => foo.on("end", next),
      () => munchy.munch(fs.createReadStream("test/fixtures/foo.txt"), bar),
      next => bar.on("end", next),
      // wait a bit after last stream end so munchy has a chance to emit the munched event
      next => setTimeout(next, 20),
      () => expect(munched).to.equal(true),
      () => munchy.munch(null),
      next => munchy.on("end", next),
      () => {
        expect(data.map(x => x.toString().trim()).join("")).to.equal("helloworldfoofoobar");
      }
    );
  });

  it("should handle munch a bunch of non-streams and then null", () => {
    const munchy = new Munchy();

    let munched = false;
    munchy.once("munched", () => {
      munched = true;
    });

    const { data } = drainIt(munchy);

    return asyncVerify(
      () => munchy.munch("a", "b"),
      // let events have a chance to emit
      next => setTimeout(next, 20),
      () => munchy.munch(null),
      next => {
        expect(munched).to.equal(true);
        munchy.on("end", () => {
          next();
        });
      },
      () => {
        expect(data.join("")).to.equal("ab");
      }
    );
  });

  it("should throw if trying to read after destroy", () => {
    const munchy = new Munchy({}, "hello", "world", null);
    drainIt(munchy);
    return asyncVerify(
      next => munchy.on("end", next),
      expectErrorHas(next => {
        munchy.on("error", next);
        munchy.munch("test");
      }, "_read called after destroy")
    );
  });

  it("should error if a source stream error", () => {
    const munchy = new Munchy();

    const p = new PassThrough();
    drainIt(munchy);
    munchy.munch(p);

    return asyncVerify(
      expectErrorToBe(next => {
        munchy.on("error", next);
        munchy.on("draining", () => {
          process.nextTick(() => p.emit("error", new Error("test")));
        });
      }, "test")
    );
  });

  it("should error if a source stream emit error w/o Error object", () => {
    const munchy = new Munchy();

    const p = new PassThrough();
    drainIt(munchy);
    munchy.munch(p);

    return asyncVerify(
      expectErrorHas(next => {
        munchy.on("error", next);
        munchy.on("draining", () => {
          process.nextTick(() => p.emit("error"));
        });
      }, "source stream emitted error")
    );
  });
});
