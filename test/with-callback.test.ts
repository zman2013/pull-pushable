import * as pull from 'pull-stream'
import { pushable } from '../src'

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms))

describe('with-callback', () => {
  it('push with callback', done => {
    const buf = pushable()
    const callback = jest.fn(err => err || Date.now() - startTime)

    pull(
      buf,
      pull.asyncMap(async (data, cb) => {
        await delay(100)
        cb(null, data)
      }),
      pull.take(2),
      pull.collect((err, results) => {
        expect(err).toBeFalsy()
        expect(results).toEqual([1, 2])
        expect(callback).toBeCalledTimes(3)
        expect(callback.mock.results[0].value).toBeLessThan(20)
        expect(callback.mock.results[1].value).toBeGreaterThan(90)
        done()
      })
    )

    const startTime = Date.now()
    buf.push(1, callback)
    buf.push(2, callback)
    buf.push(3, callback)
    buf.end()
  })
})
