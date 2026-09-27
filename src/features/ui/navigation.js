export function getActiveDestination(pathname) {
  if (pathname === '/home') return '/home'
  if (pathname === '/biblioteca' || pathname.startsWith('/estudo-guiado') || pathname === '/descobrir' || pathname.startsWith('/livro/')) return '/biblioteca'
  if (pathname === '/reflexoes') return '/reflexoes'
  return '/mais'
}

