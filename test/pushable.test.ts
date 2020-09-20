import * as pull from 'pull-stream'
import { pushable } from '../src'
import { getProbe } from './common'

describe('pushable', () => {
  it('read', done => {
    const probe = getProbe()
    const buf = pushable('name', err => {
      expect(err).toBeNull()
      done()
    })

    // should be a read function!
    expect(typeof buf).toBe('function')

    const source = pull(buf, probe)

    buf.push(1)
    expect(buf.buffer).toEqual([[1, undefined]])

    pull(
      source,
      pull.collect((_, array) => {
        probe.terminate()
        expect(array).toEqual([1, 2, 3])
      })
    )

    buf.push(2)
    buf.push(3)
    buf.end()
  })
})
