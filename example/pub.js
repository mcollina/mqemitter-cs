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
