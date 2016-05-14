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

var abstractTest = require('mqemitter/abstractTest')
var test = require('tape').test
var mqemitter = require('mqemitter')
var cs = require('./')
var net = require('net')
var main = mqemitter()
var server = net.createServer(cs.server(main))

server.listen(0, function (err) {
  if (err) {
    throw err
  }

  server.unref()

  abstractTest({
    builder: function (opts) {
      opts = opts || {}

      if (opts.wildcardOne) {
        opts.wildcardOne = {
          here: opts.wildcardOne,
          there: '+'
        }
      }

      if (opts.wildcardSome) {
        opts.wildcardSome = {
          here: opts.wildcardSome,
          there: '#'
        }
      }

      if (opts.separator) {
        opts.separator = {
          here: opts.separator,
          there: '/'
        }
      }

      return cs.client(net.connect(server.address()), opts)
    },
    test: test
  })
})
