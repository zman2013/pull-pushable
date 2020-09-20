import * as pull from 'pull-stream'
import { pushable } from '../src'
import { getProbe } from './common'

describe('pushable', () => {
  it('end before push', done => {
    const probe = getProbe()
    const buf = pushable()
    const source = pull(buf, probe)
    buf.end()
    buf.push(1)

    source(null, function(end, data) {
      probe.terminate()
      expect(end).toBeTruthy()
      expect(data).toBeFalsy()
      done()
    })
  })

  it('end', done => {
    const probe = getProbe()
    const buf = pushable()
    const source = pull(buf, probe)

    buf.push(1)
    buf.push(2)
    buf.push(3)
    buf.end()

    source(null, function(end, data) {
      expect(data).toBe(1)
      source(null, function(end, data) {
        expect(data).toBe(2)
        source(null, function(end, data) {
          expect(data).toBe(3)
          source(null, function(end, data) {
            expect(data).toBeUndefined()
            expect(end).toBeTruthy()
            done()
          })
        })
      })
    })
  })

  it('end after end', done => {
    const probe = getProbe()
    const _err = new Error('test error')
    const buf = pushable()
    const source = pull(buf, probe)

    buf.end(_err)
    buf.end()

    source(_err, err => {
      probe.terminate()
      expect(err).toBe(_err)
      done()
    })
  })

  it('end after abort', done => {
    const probe = getProbe()
    const _err = new Error('test error')
    const buf = pushable()
    const source = pull(buf, probe)

    buf.abort(_err)
    buf.end()

    source(_err, err => {
      probe.terminate()
      expect(err).toBe(_err)
      done()
    })
  })
})
