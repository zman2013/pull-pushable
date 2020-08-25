import { pushable } from '../src'

describe('pushable', () => {
  it('abort after a read', done => {
    const _err = new Error('test error')
    const p = pushable(err => {
      expect(err).toBe(_err)
      done()
    })

    // manual read.
    p(null, err => {
      expect(err).toBe(_err)
    })

    p(_err, err => {
      expect(err).toBe(_err)
    })
  })

  it('abort without a read', done => {
    const _err = new Error('test error')
    const p = pushable(err => {
      expect(err).toBe(_err)
      done()
    })

    p(_err, err => {
      expect(err).toBe(_err)
    })
  })

  it('abort without a read, with data', done => {
    const _err = new Error('test error')
    const p = pushable(err => {
      expect(err).toBe(_err)
      done()
    })

    p(_err, err => {
      expect(err).toBe(_err)
    })

    p.push(1)
  })

  it('abort before push', done => {
    const p = pushable(err => {
      expect(err).toBeFalsy()
      done()
    })

    p(null, (err, data) => {
      expect(err).toBeTruthy()
      expect(data).toBeFalsy()
    })

    p.abort()
    p.push(1)
  })
})
