/** Use the configured public origin, never the proxy's internal address. */
export function appOrigin(): string {
  const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_URL or NEXTAUTH_URL must specify the public application URL.');
  }
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function appUrl(path: string): URL {
  return new URL(path, appOrigin());
}
