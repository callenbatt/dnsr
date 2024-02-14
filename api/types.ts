import dns from "dns";

export type ResolveQueryType =
  | "ns"
  | "ipv4"
  | "ipv6"
  | "cname"
  | "caa"
  | "mx"
  | "txt";

export type FormattedRecord = {
  data: string;
  ttl?: number;
};

export type ResolveReturnTypes = {
  ns: string[] | undefined;
  ipv4: dns.RecordWithTtl[] | undefined;
  ipv6: dns.RecordWithTtl[] | undefined;
  cname: string[] | undefined;
  caa: dns.CaaRecord[] | undefined;
  mx: dns.MxRecord[] | undefined;
  txt: string[][] | undefined;
};
