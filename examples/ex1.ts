import pull = require('pull-stream')
import { pushable } from '../src'

const buf = pushable()

buf.push(1)
pull(
  buf,
  pull.collect((_, array) => {
    console.log(array)
  })
)

// SOMETIMES YOU NEED PUSH!

buf.push(2)
buf.push(3)
buf.end()
