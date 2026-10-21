import type { APIRoute } from 'astro'
import { project } from '../../../shared/lib/project.mjs'
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\n${project.template ? 'Disallow: /' : 'Allow: /'}\nSitemap: ${project.url}sitemap-index.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
