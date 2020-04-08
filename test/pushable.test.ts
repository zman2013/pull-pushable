import * as pull from 'pull-stream'
import { pushable } from '../src'

describe('pushable', () => {
  it('read', done => {
    const buf = pushable()

    // should be a read function!
    expect(typeof buf).toBe('function')

    buf.push(1)
    expect(buf.buffer).toEqual([1])
    pull(
      buf,
      pull.collect((_, array) => {
        expect(array).toEqual([1, 2, 3])
        done()
      })
    )

    buf.push(2)
    buf.push(3)
    buf.end()
  })
})
