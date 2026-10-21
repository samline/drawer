import type { APIRoute } from 'astro'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const GET: APIRoute = async () =>
  new Response(await readFile(resolve('../skills/drawer/SKILL.md'), 'utf8'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
