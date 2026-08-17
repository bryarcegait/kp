// DATABASE_URL is stored in the standard "mysql://" form with Prisma's own
// SSL param (sslaccept=strict) so the Prisma CLI (db push/migrate/studio)
// can use it directly. The mariadb driver package used at runtime has a
// different scheme ("mariadb://") and SSL param (ssl=true), so we translate
// it here instead of maintaining two separate env vars.
export function toMariaDbUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl.replace(/^mysql:/, "mariadb:"));
  const sslAccept = url.searchParams.get("sslaccept");

  url.searchParams.delete("sslaccept");

  if (sslAccept === "strict") {
    url.searchParams.set("ssl", "true");
  } else {
    url.searchParams.delete("ssl");
  }

  if (!url.searchParams.has("connectionLimit")) {
    url.searchParams.set("connectionLimit", "2");
  }

  if (!url.searchParams.has("connectTimeout")) {
    url.searchParams.set("connectTimeout", "15000");
  }

  if (!url.searchParams.has("acquireTimeout")) {
    url.searchParams.set("acquireTimeout", "25000");
  }

  return url.toString();
}
