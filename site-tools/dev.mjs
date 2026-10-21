import { spawn } from 'node:child_process'
const children = [
  ['landing', '4340'],
  ['docs', '4341'],
].map(([workspace, port]) =>
  spawn(
    'npm',
    [
      'run',
      'dev',
      '--workspace',
      workspace,
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      port,
      '--ignore-lock',
    ],
    { stdio: 'inherit' }
  )
)
let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop)
for (const child of children)
  child.on('exit', code => {
    if (!stopping) {
      process.exitCode = code ?? 1
      stop()
    }
  })
