/** Astro dev compilers own separate module namespaces. Production has one static origin. */
export const developmentRedirect = ({ origin, include }) => ({
  name: 'package-site-development-routes',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = request.originalUrl ?? request.url ?? '/'
      const pathname = path.split('?')[0]
      if (pathname !== include.replace(/\/$/, '') && !pathname.startsWith(include)) return next()
      response.writeHead(307, { Location: `${origin}${path}` })
      response.end()
    })
  },
})
