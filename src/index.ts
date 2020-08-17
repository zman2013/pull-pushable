import pull from '@jacobbubu/pull-stream'
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
  (endOrError: pull.Abort, cb: pull.SourceCallback<T>): undefined
  end: (end?: pull.EndOrError) => void
  abort: (end?: pull.EndOrError) => void
  push: (data: T, bufferedCb?: BufferItemCallback) => void
  buffer: BufferItem<T>[]
}
export function pushable<T>(name?: string | OnClose, onclose?: OnClose): Read<T> {
  let _name: string
  let _onclose: OnClose | undefined
  const buffer: BufferItem<T>[] = []

  // indicates that the downstream want's to abort the stream
  let aborted: Error | boolean | null = false
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
    drain()
  }

  const abort = (end?: pull.EndOrError) => {
    logger.debug('abort(end=%o) has been called', end)
    aborted = aborted || end || true
    drain()
  }

  const push = (data: T, bufferedCb?: BufferItemCallback) => {
    logger.info('push(data=%o), ended: %o', data, ended)
    if (ended) return
    // if sink already waiting,
    // we can call back directly.
    if (cb) {
      callback(aborted, [data, bufferedCb])
      return
    }
    // otherwise buffer data
    buffer.push([data, bufferedCb])
  }

  const read: Read<T> = (_abort: pull.Abort, _cb: pull.SourceCallback<T>) => {
    logger.info('read(abort=%o)', _abort)
    if (_abort) {
      aborted = _abort
      // if there is already a cb waiting, abort it.
      if (cb) {
        callback(aborted, [])
      }
    }
    cb = _cb
    drain()
    return undefined
  }

  read.end = end
  read.abort = abort
  read.push = push
  read.buffer = buffer

  const drain = () => {
    if (!cb) return

    if (aborted) {
      callback(aborted)
    } else if (buffer.length === 0 && ended) {
      callback(ended)
    } else if (buffer.length > 0) {
      callback(null, buffer.shift())
    }
  }

  const callback = (err: pull.EndOrError, item?: BufferItem<T>) => {
    let _cb = cb

    if (err) {
      if (!item) {
        // missing item means the caller wants to clean whole buffer
        buffer.forEach(item => {
          item[BufferItemIndex.Cb]?.(err)
        })
      } else {
        item[BufferItemIndex.Cb]?.(err)
      }

      if (_onclose) {
        let c = _onclose
        _onclose = undefined
        logger.debug('call onClose back with argument(%o)', err === true ? null : err)
        c(err === true ? null : err)
      }
      cb = undefined
      _cb?.(err)
      logger.debug('callback with argument(err=%o)', err)
    } else {
      const [data, bufferedCb] = item!
      bufferedCb?.(null)
      cb = undefined
      _cb?.(null, data)
      logger.debug('callback with argument(data=%o)', data)
    }
  }
  return read
}
