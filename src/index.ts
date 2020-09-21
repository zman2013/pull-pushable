import * as pull from 'pull-stream'
import { Debug } from '@jacobbubu/debug'
import { SourceState } from './source-state'
import { trueToNull } from './utils'

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

  const _sourceState = new SourceState()
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
    if (!_sourceState.normal) return

    _buffer.push([data, bufferedCb])
    drain()
  }

  const read: Read<T> = (abort: pull.Abort, cb: pull.SourceCallback<T>) => {
    logger.info('read(abort=%o)', abort)
    if (_sourceState.finished) {
      return cb(_sourceState.finished)
    }

    _cbs.push(cb)

    if (abort) {
      _sourceState.askAbort(abort)
    }
    drain()
  }

  read.end = end
  read.abort = abort
  read.push = push
  read.buffer = _buffer

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
      _onclose?.(trueToNull(_sourceState.finished))
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
      _onclose?.(trueToNull(_sourceState.finished))
    }
  }
  return read
}
