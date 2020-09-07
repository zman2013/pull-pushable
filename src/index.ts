import * as pull from 'pull-stream'
import { Debug } from '@jacobbubu/debug'

const getPushableName = (function() {
  let counter = 1
  return () => (counter++).toString()
})()

type OnClose = (err?: pull.EndOrError) => void

const DefaultLogger = Debug.create('pushable')

export enum BufferItemIndex {
  Data = 0,
  Cb
}

export type BufferItemCallback = (endOrError: pull.EndOrError) => void
export type BufferItem<T> = [T?, BufferItemCallback?]

export interface Read<T> {
  (endOrError: pull.Abort, cb: pull.SourceCallback<T>): void
  end: (end?: pull.EndOrError) => void
  abort: (end?: pull.EndOrError) => void
  push: (data: T, bufferedCb?: BufferItemCallback) => void
  buffer: BufferItem<T>[]
}
export function pushable<T>(name?: string | OnClose, onclose?: OnClose): Read<T> {
  let _name: string
  let _onclose: OnClose | undefined
  let _buffer: BufferItem<T>[] = []

  // indicates that the downstream want's to abort the stream
  let _askAbort: Error | boolean | null = false
  let _askEnd: pull.EndOrError = null
  let _ended: pull.EndOrError = null
  let _cbs: pull.SourceCallback<T>[] = []

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
    _askEnd = _askEnd || end || true
    drain()
  }

  const abort = (end?: pull.EndOrError) => {
    logger.debug('abort(end=%o) has been called', end)
    _askAbort = _askAbort || end || true
    drain()
  }

  const push = (data: T, bufferedCb?: BufferItemCallback) => {
    logger.info('push(data=%o), ended: %o', data, _askEnd)
    if (_askEnd) return

    _buffer.push([data, bufferedCb])
    drain()
  }

  const read: Read<T> = (abort: pull.Abort, cb: pull.SourceCallback<T>) => {
    logger.info('read(abort=%o)', abort)
    if (_ended) {
      return cb(_ended)
    }

    _cbs.push(cb)

    if (abort) {
      _askAbort = abort
    }
    drain()
  }

  read.end = end
  read.abort = abort
  read.push = push
  read.buffer = _buffer

  const drain = () => {
    while (_buffer.length > 0) {
      const cb = _cbs.shift()
      if (cb) {
        const bufferItem = _buffer.shift()!
        cb(null, bufferItem[BufferItemIndex.Data])
        bufferItem[BufferItemIndex.Cb]?.(null)
      } else {
        break
      }
    }

    if (_askAbort) {
      // in case there's still data in the _buffer
      _buffer.forEach(bufferItem => {
        bufferItem[BufferItemIndex.Cb]?.(_askAbort)
      })
      _buffer = []

      // call of all waiting callback functions
      _cbs.forEach(cb => {
        cb(_askAbort)
      })
      _ended = _askAbort
      _cbs = []

      _onclose?.(_ended === true ? null : _ended)
      return
    }

    if (_askEnd) {
      // more cb is needed to satisfy the buffer
      if (_buffer.length > 0) return

      // call of all waiting callback functions
      _cbs.forEach(cb => {
        cb(_askEnd)
      })
      _ended = _askEnd
      _cbs = []

      _onclose?.(_ended === true ? null : _ended)
    }
  }
  return read
}
