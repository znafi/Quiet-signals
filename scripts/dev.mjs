import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')

const extraArgs = process.argv.slice(2)
const next = spawn(process.execPath, [nextBin, 'dev', '--hostname', 'localhost', '--webpack', ...extraArgs], {
  stdio: ['inherit', 'pipe', 'pipe'],
})

function writeFiltered(stream, chunk) {
  const lines = chunk.toString().split(/(?<=\n)/)

  for (const line of lines) {
    if (line.includes('- Network:')) continue
    stream.write(line)
  }
}

next.stdout.on('data', (chunk) => writeFiltered(process.stdout, chunk))
next.stderr.on('data', (chunk) => writeFiltered(process.stderr, chunk))

next.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
