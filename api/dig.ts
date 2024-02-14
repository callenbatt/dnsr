import dns from "dns";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type {
  ResolveQueryType,
  FormattedRecord,
  ResolveReturnTypes,
} from "./types";
const DEFAULT_SERVER_IPS = ["1.1.1.1"];

const resolve: {
  [T in ResolveQueryType]: (name: string) => Promise<ResolveReturnTypes[T]>;
} = {
  caa: (name: string) => dns.promises.resolveCaa(name),
  cname: (name: string) => dns.promises.resolveCname(name),
  ipv4: (name: string) => dns.promises.resolve4(name, { ttl: true }),
  ipv6: (name: string) => dns.promises.resolve6(name, { ttl: true }),
  mx: (name: string) => dns.promises.resolveMx(name),
  ns: (name: string) => dns.promises.resolveNs(name),
  txt: (name: string) => dns.promises.resolveTxt(name),
};

const formatRecords: {
  [T in ResolveQueryType]: (
    records: ResolveReturnTypes[T]
  ) => FormattedRecord[];
} = {
  caa: (records) =>
    records?.map((record) => ({
      data: Object.keys(record).reduce((a, c) => {
        if (c === "critical") return `${a.concat(record[c].toString())} `;
        return a.concat(`${c} "${record[c as keyof dns.CaaRecord]}"`);
      }, ""),
    })) || [],
  cname: (records) => records?.map((record) => ({ data: record })) || [],
  ipv4: (records) =>
    records?.map((record) => ({ data: record.address, ttl: record.ttl })) || [],
  ipv6: (records) =>
    records?.map((record) => ({ data: record.address, ttl: record.ttl })) || [],
  mx: (records) =>
    records?.map((record) => ({
      data: record.priority + " " + record.exchange,
    })) || [],
  ns: (records) => [],
  txt: (records) =>
    records?.map((record) => ({ data: record.join(" ") })) || [],
};

async function handleResolve<T extends ResolveQueryType>(
  type: T,
  name: string
): Promise<ResolveReturnTypes[T] | undefined> {
  try {
    return await resolve[type](name);
  } catch (e) {
    console.error(e);
    return;
  }
}

async function handleAndFormatResolve<T extends ResolveQueryType>(
  type: T,
  name: string
): Promise<FormattedRecord[] | undefined> {
  try {
    const records = await resolve[type](name);
    return formatRecords[type](records);
  } catch (e) {
    // console.error(e);
    return;
  }
}

async function getNameServers(name: string) {
  let ns;
  while (!ns && name.indexOf(".") > -1) {
    ns = await handleResolve("ns", name);
    if (!ns) name = name.split(".").slice(1).join(".");
  }
  return ns as string[];
}

async function getAllRecords(name: string, ips: string[]) {
  dns.promises.setServers(ips);

  const records = await Promise.all(
    ["ipv4", "ipv6", "cname", "mx", "txt", "caa"].map(async (type) => {
      const key = type === "ipv4" ? "a" : type === "ipv6" ? "aaaa" : type;
      return {
        [key]: await handleAndFormatResolve(type as ResolveQueryType, name),
      };
    })
  );

  dns.promises.setServers(DEFAULT_SERVER_IPS);

  return Object.assign({}, ...records);
}

async function queryAuthorativeServers(name: string) {
  let answers = [];
  const nameServers = await getNameServers(name);

  if (!nameServers) return [];

  for (const nameServer of nameServers) {
    const nameServerIPs = (await handleResolve("ipv4", nameServer))?.map(
      (x) => x.address
    );

    if (!nameServerIPs) {
      answers.push({ nameServer, nameServerIPs: [], records: {} });
      continue;
    }

    const records = await getAllRecords(name, nameServerIPs);
    answers.push({ nameServer, nameServerIPs, records });
  }

  return answers;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.json(await queryAuthorativeServers(req.query.name as string));
}
