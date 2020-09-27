import * as pull from 'pull-stream'
import { Debug } from '@jacobbubu/debug'
import { State } from './state'
import { trueToNull } from './utils'
import { Options } from '@jacobbubu/pull-stream-protocol-checker'

export * from './state'

const getPushableName = (function() {
  let counter = 1
  return () => (counter++).toString()
})()

type OnClose = (err?: pull.EndOrError) => void
type OnReadCallback<T> = (end?: pull.EndOrError, data?: T) => void
type OnRead<T> = (cb: OnReadCallback<T>) => void

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
  finished: () => pull.EndOrError
}
export function pushable<T>(
  name?: string | OnClose,
  onClose?: OnClose,
  onRead?: OnRead<T>
): Read<T> {
  let _name: string
  let _onClose: OnClose | undefined
  if (typeof name === 'string') {
    _name = name
    _onClose = onClose
  } else {
    _name = getPushableName()
    _onClose = name
  }
  let _onRead = onRead

  let _buffer: BufferItem<T>[] = []

  const _sourceState = new State({ onEnd: _onClose })
  let _cbs: pull.SourceCallback<T>[] = []

  let logger = DefaultLogger.ns(_name)

  const end = (end?: pull.EndOrError) => {
    if (!_sourceState.askEnd(end)) return

    logger.debug('end(end=%o) has been called', end)
    drain()
  }

  const abort = (end?: pull.EndOrError) => {
    if (!_sourceState.askAbort(end)) return

    logger.debug('abort(end=%o) has been called', end)
    drain()
  }

  const push = (data: T, bufferedCb?: BufferItemCallback) => {
    logger.info('push(data=%o), ended: %o', data, _sourceState)
    if (!_sourceState.normal) return false

    _buffer.push([data, bufferedCb])
    drain()
    return true
  }

  const read: Read<T> = (abort: pull.Abort, cb: pull.SourceCallback<T>) => {
    logger.info('read(abort=%o)', abort)
    if (_sourceState.finished) {
      return cb(_sourceState.finished)
    }

    _cbs.push(cb)

    if (abort) {
      _sourceState.askAbort(abort)
    } else {
      _onRead?.((end, data) => {
        if (end) {
          _sourceState.askEnd(end)
        } else if (typeof data !== 'undefined') {
          push(data)
        }
      })
      drain()
      return
    }

    drain()
  }

  read.end = end
  read.abort = abort
  read.push = push
  read.buffer = _buffer
  read.finished = () => _sourceState.finished

  const drain = () => {
    if (_sourceState.aborting) {
      const abort = _sourceState.aborting
      // in case there's still data in the _buffer
      _buffer.forEach(bufferItem => {
        bufferItem[BufferItemIndex.Cb]?.(abort)
      })
      _buffer = []

      // call of all waiting callback functions
      while (_cbs.length > 0) {
        _cbs.shift()?.(abort)
      }

      _sourceState.ended(abort)
      return
    }

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

    if (_sourceState.ending) {
      const end = _sourceState.ending
      // more cb is needed to satisfy the buffer
      if (_buffer.length > 0) return

      // call of all waiting callback functions
      while (_cbs.length > 0) {
        _cbs.shift()?.(end)
      }
      _sourceState.ended(end)
    }
  }
  return read
}
