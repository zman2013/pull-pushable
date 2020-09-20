import checker from '@jacobbubu/pull-stream-protocol-checker'

export function getProbe() {
  return checker({ forbidExtraRequests: true, enforceStreamTermination: true, notifyEagerly: true })
}
