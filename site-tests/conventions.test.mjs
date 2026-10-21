import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const sourceFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(entry => {
      const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
      return entry.isDirectory() ? sourceFiles(path) : path
    })
  )
  return files.flat().filter(path => /\.(astro|ts|js|mjs)$/.test(path.pathname))
}

test('maintained integrations use functions without classes or this', async () => {
  const roots = ['../shared/components/', '../shared/lib/', '../landing/src/', '../docs/src/']
  const files = (
    await Promise.all(roots.map(root => sourceFiles(new URL(root, import.meta.url))))
  ).flat()
  const violations = []
  for (const path of files) {
    const source = await readFile(path, 'utf8')
    const scripts = path.pathname.endsWith('.astro')
      ? [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1])
      : [source]
    for (const script of scripts) {
      const ast = ts.createSourceFile(
        path.pathname,
        script,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      )
      const inspect = node => {
        if (
          ts.isClassDeclaration(node) ||
          ts.isClassExpression(node) ||
          node.kind === ts.SyntaxKind.ThisKeyword
        )
          violations.push(path.pathname)
        ts.forEachChild(node, inspect)
      }
      inspect(ast)
    }
  }
  assert.deepEqual(violations, [])
})
