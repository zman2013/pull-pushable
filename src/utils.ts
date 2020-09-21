import * as pull from 'pull-stream'

export function trueToNull(endOrError: pull.EndOrError) {
  return endOrError === true ? null : endOrError
}
