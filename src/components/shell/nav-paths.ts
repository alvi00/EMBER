/** Whether a nav item is the current section ("/" only matches the landing page itself). */
export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
