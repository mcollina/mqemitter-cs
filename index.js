/*
 * Copyright (c) 2016, Matteo Collina <hello@matteocollina.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
 * IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

'use strict'

var tentacoli = require('tentacoli')
var mqstreams = require('mqstreams')
var pump = require('pump')
var msgpack = require('msgpack-lite')
var Writable = require('readable-stream').Writable
var inherits = require('inherits')
// we cannot use array.find because it is not in node v0.12
var find = require('lodash.find')

function Client (stream, opts) {
  if (!(this instanceof Client)) {
    return new Client(stream, opts)
  }

  this._opts = opts || {}

  this.tentacoli = tentacoli({
    codec: msgpack
  })
  this.stream = stream

  this.current = 0

  this._subscriptions = new Map()

  this.closed = false

  pump(stream, this.tentacoli, stream)
}

Client.prototype.emit = function (obj, cb) {
  cb = cb || noop

  if (this.closed) {
    return cb(new Error('Closed'))
  }

  obj.topic = this._fixTopic(obj.topic)

  this.tentacoli.request({
    cmd: 'publish',
    message: obj
  }, cb)
}

function Ermes (onMessage, client) {
  this.onMessage = onMessage
  this.client = client

  Writable.call(this, {
    objectMode: true
  })
}

inherits(Ermes, Writable)

Ermes.prototype._write = function (chunk, enc, cb) {
  this.client.current++
  chunk.topic = this.client._fixTopicReverse(chunk.topic)
  this.onMessage.call(this.client, chunk, cb)
  this.client.current--
}

Ermes.prototype.destroy = function () {
  this.end()
}

Client.prototype._fixTopic = function (topic) {
  var opts = this._opts

  if (opts.wildcardOne) {
    topic = topic.replace(opts.wildcardOne.here, opts.wildcardOne.there)
  }

  if (opts.wildcardSome) {
    topic = topic.replace(opts.wildcardSome.here, opts.wildcardSome.there)
  }

  if (opts.separator) {
    topic = topic.replace(opts.separator.here, opts.separator.there)
  }

  return topic
}

Client.prototype._fixTopicReverse = function (topic) {
  var opts = this._opts

  if (opts.wildcardOne) {
    topic = topic.replace(opts.wildcardOne.there, opts.wildcardOne.here)
  }

  if (opts.wildcardSome) {
    topic = topic.replace(opts.wildcardSome.there, opts.wildcardSome.here)
  }

  if (opts.separator) {
    topic = topic.replace(opts.separator.there, opts.separator.here)
  }

  return topic
}

Client.prototype.on = function (topic, onMessage, done) {
  var self = this
  var dest = new Ermes(onMessage, this)

  topic = this._fixTopic(topic)

  if (!self._subscriptions.has(topic)) {
    self._subscriptions.set(topic, [dest])
  } else {
    self._subscriptions.get(topic).push(dest)
  }

  this.tentacoli.request({
    cmd: 'subscribe',
    topic: topic
  }, function (err, result) {
    if (err) {
      return done(err)
    }

    pump(result.streams.messages, dest, function () {
      self.removeListener(topic, onMessage)
    })

    if (done) {
      done()
    }
  })
}

Client.prototype.removeListener = function (topic, onMessage, done) {
  var streams = this._subscriptions.get(topic)
  if (!streams) { return done() }

  var dest = find(streams, isDest)

  if (dest) {
    streams = streams.filter(isDest)
    dest.destroy()
  }

  if (done) {
    setImmediate(done)
  }

  function isDest (stream) {
    return stream.onMessage === onMessage
  }
}

Client.prototype.close = function (cb) {
  if (!this.closed) {
    this.closed = true
    this.tentacoli.destroy()
  }

  if (cb) {
    setImmediate(cb)
  }
}

function server (instance) {
  instance = mqstreams(instance)

  function onRequest (req, reply) {
    if (req.cmd === 'subscribe') {
      if (!req.topic) {
        return reply(new Error('missing topic'))
      }

      reply(null, {
        streams: {
          messages: instance.readable(req.topic)
        }
      })
    } else if (req.cmd === 'publish') {
      if (!req.message || !req.message.topic) {
        return reply(new Error('wrong publish format'))
      }
      instance.emit(req.message, reply)
    } else {
      reply(new Error('cmd not found'))
    }
  }

  return function handle (socket) {
    var server = this
    var multi = tentacoli({
      codec: msgpack
    })

    multi.on('request', onRequest)

    pump(multi, socket, multi, function (err) {
      if (err) {
        server.emit('clientError', err)
      }
    })
  }
}

function noop () {}

module.exports.client = Client
module.exports.server = server
