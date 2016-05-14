'use strict'

var mqemitter = require('mqemitter')
var cs = require('../')
var net = require('net')
var main = mqemitter()
var server = net.createServer(cs.server(main))

server.listen(8800, function (err) {
  if (err) {
    throw new Error('unable to listen')
  }
  console.log('server listening on port', 8800)
})
