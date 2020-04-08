import pull from 'pull-stream'
import { Debug } from '@jacobbubu/debug'

const getPushableName = (function() {
  let counter = 1
  return () => (counter++).toString()
})()

type OnClose = (err?: pull.EndOrError) => void

const DefaultLogger = Debug.create('pushable')

export interface Read<T> {
  (endOrError: pull.Abort, cb: pull.SourceCallback<T>): undefined
  end: (end?: pull.EndOrError) => void
  push: (data: T) => void
  buffer: T[]
}
export function pushable<T>(name?: string | OnClose, onclose?: OnClose): Read<T> {
  let _name: string
  let _onclose: OnClose | undefined
  const buffer: any[] = []

  // indicates that the downstream want's to abort the stream
  let abort: Error | boolean | null = false
  let ended: pull.EndOrError = null
  let cb: pull.SourceCallback<T> | undefined

  if (typeof name === 'function') {
    _onclose = name
    name = undefined
  } else {
    _onclose = onclose
  }
  _name = name || getPushableName()
  let logger = DefaultLogger.ns(_name)

  const end = (end?: pull.EndOrError) => {
    logger.debug('end(end=%o) has been called', end)
    ended = ended || end || true
    // attempt to drain
    drain()
  }

  const push = (data: unknown) => {
    logger.info('push(data=%o), ended: %o', data, ended)
    if (ended) return
    // if sink already waiting,
    // we can call back directly.
    if (cb) {
      callback(abort, data)
      return
    }
    // otherwise buffer data
    buffer.push(data)
  }

  const read: Read<T> = (endOrError: pull.EndOrError, _cb: pull.SourceCallback<T>) => {
    logger.info('read(abort=%o)', endOrError)
    if (endOrError) {
      abort = endOrError
      // if there is already a cb waiting, abort it.
      if (cb) {
        callback(abort)
      }
    }
    cb = _cb
    drain()
    return undefined
  }

  read.end = end
  read.push = push
  read.buffer = buffer

  const drain = () => {
    if (!cb) return

    if (abort) callback(abort)
    else if (!buffer.length && ended) callback(ended)
    else if (buffer.length) callback(null, buffer.shift())
  }

  const callback = (err: pull.EndOrError, data?: any) => {
    let _cb = cb
    // if error and pushable passed onClose, call it
    // the first time this stream ends or errors.
    if (err && _onclose) {
      let c = _onclose
      _onclose = undefined
      logger.debug('call onClose back with argument(%o)', err === true ? null : err)
      c(err === true ? null : err)
    }
    cb = undefined
    _cb && _cb(err, data)
    logger.debug('callback with argument(err=%o, data=%o)', err, data)
  }
  return read
}
