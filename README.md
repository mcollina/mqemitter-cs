# mqemitter-cs

Expose a [MQEmitter](http://github.com/mcollina/mqemitter) via a simple client/server protocol

See [MQEmitter](http://github.com/mcollina/mqemitter) for the actual
API.

[![js-standard-style](https://raw.githubusercontent.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Install

```bash
$ npm install mqemitter-cs --save
```

## Example

### Server

```js
'use strict'

var mqemitter = require('mqemitter')
var cs = require('./')
var net = require('net')
var main = mqemitter()
var server = net.createServer(cs.server(main))

server.listen(8800, function (err) {
  if (err) {
    throw new Error('unable to listen')
  }
  console.log('server listening on port', 8800)
})
```

### Client: publishing

```js
'use strict'

var cs = require('../')
var net = require('net')
var client = cs.client(net.connect(8800))

client.emit({
  topic: 'hello',
  args: process.argv.slice(2)
}, function () {
  client.close()
})
```

### Client: subscribing

```js
'use strict'

var cs = require('../')
var net = require('net')
var client = cs.client(net.connect(8800))

client.on('hello', function (chunk, cb) {
  console.log(chunk)
  cb()
})
```

## MIT

MIT
