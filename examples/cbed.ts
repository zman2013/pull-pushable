import * as pull from 'pull-stream'
import { pushable } from '../src'

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms))
const buf = pushable()

const main = async () => {
  pull(
    buf,
    pull.asyncMap(async (data, cb) => {
      await delay(100)
      cb(null, data)
    }),
    pull.take(2),
    pull.collect((_, array) => {
      console.log(array)
    })
  )

  const startTime = Date.now()

  const taggedCb = (tag: string) => (err: pull.EndOrError) => {
    if (err) {
      console.log(`the '${tag}' end with error:`, err)
    } else {
      console.log(`the '${tag}' takes ${Date.now() - startTime}ms to send`)
    }
  }

  buf.push(1, taggedCb('first'))
  buf.push(2, taggedCb('second'))
  buf.push(3, taggedCb('third'))
  buf.end()
}

// tslint:disable-next-line no-floating-promises
main()
