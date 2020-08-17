import * as pull from '@jacobbubu/pull-stream'
import { pushable } from '../src'

describe('pushable', () => {
  it('on close callback', done => {
    let i = 0

    const p = pushable(function(err) {
      if (err) throw err
      expect(i).toBe(3)
      done()
    })

    pull(
      p,
      pull.take(3),
      pull.drain(d => {
        expect(d).toBe(++i)
      }, done)
    )

    p.push(1)
    p.push(2)
    p.push(3)
    p.push(4)
    p.push(5)
  })
})
