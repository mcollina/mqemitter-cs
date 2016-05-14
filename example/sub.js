'use strict'

var cs = require('../')
var net = require('net')
var client = cs.client(net.connect(8800))

client.on('hello', function (chunk, cb) {
  console.log(chunk)
  cb()
})
