import * as pull from 'pull-stream'
import { pushable } from '../src'
import { getProbe } from './common'

describe('pushable', () => {
  it('abort after a read', done => {
    const probe = getProbe()
    const _err = new Error('test error')
    const source = pull(
      pushable(err => {
        probe.terminate()
        expect(err).toBe(_err)
        done()
      }),
      probe
    )

    // manual read.
    source(null, err => {
      expect(err).toBe(_err)
    })

    source(_err, err => {
      expect(err).toBe(_err)
    })
  })

  it('abort without a read', done => {
    const probe = getProbe()
    const _err = new Error('test error')
    const source = pull(
      pushable(err => {
        probe.terminate()
        expect(err).toBe(_err)
        done()
      }),
      probe
    )

    source(_err, err => {
      expect(err).toBe(_err)
    })
  })

  it('abort after abort1', done => {
    const probe = getProbe()
    const _err = new Error('test error')
    const p = pushable(err => {
      probe.terminate()
      expect(err).toBe(_err)
      done()
    })
    const source = pull(p, probe)

    source(_err, err => {
      expect(err).toBe(_err)
    })
    p.abort()
  })

  it('abort after abort2', done => {
    const probe = getProbe()
    const _err = new Error('test error')
    const p = pushable(err => {
      expect(err).toBeNull()
    })
    const source = pull(p, probe)

    p.abort()
    source(_err, err => {
      probe.terminate()
      expect(err).toBe(true)
      done()
    })
  })

  it('abort without a read, with data', done => {
    const probe = getProbe()
    const _err = new Error('test error')
    const p = pushable(err => {
      probe.terminate()
      expect(err).toBe(_err)
      done()
    })
    const source = pull(p, probe)

    source(_err, err => {
      expect(err).toBe(_err)
    })

    p.push(1)
  })

  it('abort before push', done => {
    const probe = getProbe()
    const p = pushable(err => {
      probe.terminate()
      expect(err).toBeFalsy()
      done()
    })
    const source = pull(p, probe)

    source(null, (err, data) => {
      expect(err).toBeTruthy()
      expect(data).toBeFalsy()
    })

    p.abort()
    p.push(1)
  })
})
