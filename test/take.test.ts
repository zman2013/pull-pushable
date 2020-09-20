import * as pull from 'pull-stream'
import { pushable } from '../src'
import { getProbe } from './common'

describe('pushable', () => {
  it('on close callback', done => {
    const probe = getProbe()
    let i = 0
    const p = pushable(function(err) {
      if (err) throw err
      expect(i).toBe(3)
      done()
    })

    const source = pull(p, probe)

    pull(
      source,
      pull.take(3),
      pull.drain(
        d => {
          expect(d).toBe(++i)
        },
        () => {
          probe.terminate()
        }
      )
    )

    p.push(1)
    p.push(2)
    p.push(3)
    p.push(4)
    p.push(5)
  })
})
