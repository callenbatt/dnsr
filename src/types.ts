export type ResolveQueryType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "MX"
  | "TXT"
  | "NS"
  | "CAA";
export type ResolverName = "alibaba" | "cloudflare" | "google" | "quad9";
export type ResolverIP = "1.1.1.1" | "8.8.8.8" | "9.9.9.9" | "223.5.5.5";
export type ResolverURL =
  | "https://dns.alidns.com/resolve"
  | "https://cloudflare-dns.com/dns-query"
  | "https://dns.google/resolve"
  | "https://dns.quad9.net:5053/dns-query";

export type DNSRecord = {
  name: string;
  type: number;
  TTL: number;
  data: string;
};

export type FormattedDNSRecord = {
  data: string;
  ttl: number;
};
