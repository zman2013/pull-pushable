import { pushable } from '../src'

describe('pushable', () => {
  it('abort after a read', done => {
    const _err = new Error('test error')
    const p = pushable(err => {
      expect(err).toBe(_err)
    })

    // manual read.
    p(null, err => {
      expect(err).toBe(_err)
    })

    p(_err, () => {
      done()
    })
  })

  it('abort without a read', done => {
    const _err = new Error('test error')
    const p = pushable(err => {
      expect(err).toBe(_err)
    })

    p(_err, () => {
      done()
    })
  })

  it('abort without a read, with data', done => {
    const _err = new Error('test error')
    const p = pushable(err => {
      expect(err).toBe(_err)
    })

    p(_err, () => {
      done()
    })

    p.push(1)
  })
})
