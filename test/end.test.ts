import { pushable } from '../src'

describe('pushable', () => {
  it('end before push', done => {
    const buf = pushable()
    buf.end()
    buf.push(1)

    buf(null, function(end, data) {
      expect(end).toBeTruthy()
      expect(data).toBeFalsy()
      done()
    })
  })

  it('end', done => {
    const buf = pushable()
    buf.push(1)
    buf.push(2)
    buf.push(3)
    buf.end()

    buf(null, function(end, data) {
      expect(data).toBe(1)
      buf(null, function(end, data) {
        expect(data).toBe(2)
        buf(null, function(end, data) {
          expect(data).toBe(3)
          buf(null, function(end, data) {
            expect(data).toBeUndefined()
            expect(end).toBeTruthy()
            done()
          })
        })
      })
    })
  })
})
