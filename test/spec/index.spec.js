"use strict";

const Munchy = require("../..");
const fs = require("fs");
const { PassThrough } = require("stream");

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

    return new Promise((resolve, reject) => {
      munchy.on("close", () => {
        try {
          expect(end, "didn't get end event before close event").to.be.true;
          const output = data.map(x => x.toString());
          expect(output).to.deep.equal(["hello world\n", "foo\n", "blah", "bar\n"]);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
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

    return new Promise((resolve, reject) => {
      foo.on("end", () => {
        process.nextTick(() => {
          munchy.munch(fs.createReadStream("test/fixtures/foo.txt"), bar);
          bar.on("end", () => {
            munchy.munch(null);
            munchy.on("end", () => {
              try {
                expect(data.map(x => x.toString().trim()).join("")).to.equal("helloworldfoofoobar");
                resolve();
              } catch (err) {
                reject(err);
              }
            });
          });
        });
      });
    });
  });

  it("should throw if trying to read after destroy", () => {
    const munchy = new Munchy({}, "hello", "world", null);
    drainIt(munchy);
    return new Promise((resolve, reject) => {
      munchy.on("end", () => {
        try {
          expect(() => munchy.munch("test")).to.throw("called after destroy");
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  it("should error if a source stream error", done => {
    const munchy = new Munchy();

    const p = new PassThrough();
    drainIt(munchy);
    munchy.munch(p);
    munchy.on("error", err => {
      expect(err.message).to.equal("test");
      done();
    });
    p.emit("error", new Error("test"));
  });
});
