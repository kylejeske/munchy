# munchy

A producer Node stream for draining different data, including Readable streams.

```bash
$ npm i --save munchy
```

examples:

```js
const Munchy = require("munchy");
const munchy = new Munchy();
munchy.munch("hello world", fs.createReadStream("blah"), "bye bye");
munchy.munch(null); // null terminates it
munchy.pipe(process.stdout);
```

```js
const Munchy = require("munchy");
const munchy = new Munchy({}, fs.createReadStream("foo"), fs.createReadStream("bar"));
munchy.munch(fs.createReadStream("blah"), "bye bye", null); // null terminates it
munchy.pipe(process.stdout);
```

# API

## constructor

```js
Munchy(opts, ...sources);
```

| name      | description                         |
| --------- | ----------------------------------- |
| `opts`    | [options for Node Readable stream]  |
| `sources` | variadic params of sources to munch |

## munch

```js
munchy.munch(...sources);
```

| name      | description                         |
| --------- | ----------------------------------- |
| `sources` | variadic params of sources to munch |

- Returns `this`.

- To end and terminate `munchy` stream:

```js
munchy.munch(null);
```

# Events

Munchy emits the following custom events:

| name       | description                          | payload      |
| ---------- | ------------------------------------ | ------------ |
| `draining` | starting to drain a stream source.   | `{ stream }` |
| `drained`  | done draining a stream source.       | `{ stream }` |
| `munched`  | all sources munched, ready for more. | `{ stream }` |

ie:

```js
munchy.on("draining", ({ stream }) => {});
```

# Demos

- Hapi - <https://github.com/jchip/hapi-stream-sample>
- Koa - <https://github.com/jchip/koa-stream-sample>
- express - <https://github.com/jchip/express-stream-sample>

# License

Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)

---

[options for node readable stream]: https://nodejs.org/api/stream.html#stream_new_stream_readable_options
