type ResolveQueryType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "CAA";

type ResolverName = "alibaba" | "cloudflare" | "google" | "quad9";

type ResolverURL =
  | "https://dns.alidns.com/resolve"
  | "https://cloudflare-dns.com/dns-query"
  | "https://dns.google/resolve"
  | "https://dns.quad9.net:5053/dns-query";

type ResolverIPs = "1.1.1.1" | "8.8.8.8" | "9.9.9.9" | "223.5.5.5";

type DNSRecord = {
  name: string;
  type: number;
  TTL: number;
  data: string;
};

type FormattedDNSRecord = {
  data: string;
  ttl: number;
};

const DNS_TYPES: { [key: number]: ResolveQueryType } = {
  1: "A",
  5: "CNAME",
  15: "MX",
  16: "TXT",
  28: "AAAA",
  257: "CAA",
};

const RESOLVER_URL = {
  alibaba: "https://dns.alidns.com/resolve",
  cloudflare: "https://cloudflare-dns.com/dns-query",
  google: "https://dns.google/resolve",
  quad9: "https://dns.quad9.net:5053/dns-query",
};

const RESOLVER_IPS = {
  alibaba: "223.5.5.5",
  cloudflare: "1.1.1.1",
  google: "8.8.8.8",
  quad9: "9.9.9.9",
};

function reqExceptions(
  hostname: string,
  type?: ResolveQueryType,
  resolverURL?: ResolverURL
) {
  if (resolverURL === RESOLVER_URL["alibaba"] && type === "TXT") return true;
  return;
}

async function req(
  hostname: string,
  type?: ResolveQueryType,
  resolverURL?: ResolverURL
) {
  try {
    if (reqExceptions(hostname, type, resolverURL)) return;
    console.log(hostname, type, resolverURL);
    const response = resolverURL
      ? await fetch(`${resolverURL}?name=${hostname}&type=${type}`, {
          headers: {
            accept: "application/dns-json",
          },
        })
      : await fetch(`/api/dig?name=${hostname}`);
    return await response.json();
  } catch (error) {
    console.error(error);
    return;
  }
}

function getResponsesFromResolver(hostname: string, resolverURL?: ResolverURL) {
  return Promise.all(
    Object.values(DNS_TYPES).map(async (type: ResolveQueryType) => {
      const res = await req(hostname, type, resolverURL);
      return res?.Answer || [];
    })
  );
}

function formatResponses(responses: any[]) {
  return responses.reduce(
    (a, response) => {
      response.forEach((record: DNSRecord) => {
        if (!DNS_TYPES[record.type]) return;

        const type = DNS_TYPES[record.type];

        // if the type is CAA and the record starts with #
        // it means the record is in hex format
        if (type === "CAA" && record.data.startsWith("\\#")) {
          record.data = formatCAAHexResponse(record.data);
        }

        // if the name is not present in the object
        // add it to the object
        if (!a[record.name]) {
          a.order.push(record.name);
          a[record.name] = {
            [type]: [
              {
                data: record.data,
                ttl: record.TTL,
              },
            ],
          };
          return;
        }

        // if the type is not present in the object
        // add it to the object
        if (!a[record.name][type]) {
          a[record.name][type] = [
            {
              data: record.data,
              ttl: record.TTL,
            },
          ];
          return;
        }

        // if the record is already present in the object
        // do not add it again
        if (
          a[record.name][type].some(
            (_record: FormattedDNSRecord) => _record.data === record.data
          )
        ) {
          return;
        }

        // if the record is not present in the object
        // add it to the object
        a[record.name][type].push({
          data: record.data,
          ttl: record.TTL,
        });

        return;
      });
      return a;
    },
    { order: [] }
  );
}

function formatCAAHexResponse(data: string) {
  let hexArray = data.split(" ");
  hexArray.shift();
  hexArray.shift();
  return hexArray
    .reduce((a, hex) => {
      const char = String.fromCharCode(parseInt(hex, 16));
      if (char.charCodeAt(0) > 31 && char.charCodeAt(0) < 127) {
        a += char;
      }
      return a;
    }, "")
    .replace("issue", '0 issue "')
    .concat('"');
}

const createElement = {
  resolverContainer: () => {
    const containerEl = document.createElement("div");
    containerEl.classList.add("resolver-container");
    return containerEl;
  },

  resolverHeader: (resolverName: ResolverName, resolverIPs?: string[]) => {
    const headerEl = document.createElement("header");
    headerEl.classList.add("resolver-header");
    headerEl.innerHTML = `
      <h3>${resolverName}</h3>
      <span>${
        RESOLVER_IPS[resolverName] || resolverIPs?.join(", ") || ""
      }</span>
    `;
    return headerEl;
  },

  resolverSection: () => {
    const sectionEl = document.createElement("section");
    sectionEl.classList.add("resolver-section");
    return sectionEl;
  },

  nameContainer: () => {
    const containerEl = document.createElement("div");
    containerEl.classList.add("name-container");
    return containerEl;
  },

  nameHeader: (hostname: string) => {
    const headerEl = document.createElement("header");
    headerEl.classList.add("name-header");
    headerEl.innerHTML = `
      <h4>${hostname}</h4>
    `;
    return headerEl;
  },

  nameSection: () => {
    const sectionEl = document.createElement("section");
    sectionEl.classList.add("name-section");
    return sectionEl;
  },

  type: (type: ResolveQueryType) => {
    const el = document.createElement("div");
    el.classList.add("type", `type-${type.toLowerCase()}`);
    return el;
  },

  record: (type: ResolveQueryType, record: FormattedDNSRecord) => {
    const el = document.createElement("div");
    el.classList.add("record");
    el.innerHTML = `
      <div class="type-label"><span>${type.toUpperCase()}</span></div>
      <div class="data-label"><span>${record.data}</span></div>
      <div class="ttl-label"><span>${record.ttl || ""}</span></div>
    `;
    return el;
  },
};

async function renderDOHResponses(
  hostname: string,
  resolverName: ResolverName
) {
  const responses = await getResponsesFromResolver(
    hostname,
    RESOLVER_URL[resolverName] as ResolverURL
  );

  const formattedResponse = formatResponses(responses);

  const resolverContainerEl = document.getElementById(`${resolverName}Data`);

  if (!resolverContainerEl) return;

  resolverContainerEl.appendChild(createElement.resolverHeader(resolverName));
  const resolverSectionEl = createElement.resolverSection();
  formattedResponse.order.forEach((hostname: string) => {
    const nameContainerEl = createElement.nameContainer();
    nameContainerEl.appendChild(createElement.nameHeader(hostname));

    const nameSectionEl = createElement.nameSection();

    const types = Object.keys(
      formattedResponse[hostname]
    ) as ResolveQueryType[];

    types.forEach((type) => {
      const typeEl = createElement.type(type);
      formattedResponse[hostname][type].forEach(
        (record: FormattedDNSRecord) => {
          typeEl.appendChild(createElement.record(type, record));
        }
      );
      nameSectionEl.appendChild(typeEl);
    });

    nameContainerEl.appendChild(nameSectionEl);
    resolverSectionEl.appendChild(nameContainerEl);
  });
  resolverContainerEl.appendChild(resolverSectionEl);
}

async function renderAuthoritativeResponses(hostname: string) {
  const responses = await req(hostname);
  console.log(responses);
  const authoritiativeSectionEl = document.getElementById(
    "authoritative-section"
  );
  if (!authoritiativeSectionEl) return;

  responses.forEach((response: any) => {
    const resolverContainerEl = createElement.resolverContainer();
    resolverContainerEl.appendChild(
      createElement.resolverHeader(response.nameServer, response.nameServerIPs)
    );
    const resolverSectionEl = createElement.resolverSection();

    const nameContainerEl = createElement.nameContainer();
    nameContainerEl.appendChild(createElement.nameHeader(hostname));
    const nameSectionEl = createElement.nameSection();

    const types = Object.keys(response.records) as ResolveQueryType[];

    types.forEach((type) => {
      const typeEl = createElement.type(type);
      response.records[type].forEach((record: FormattedDNSRecord) => {
        typeEl.appendChild(createElement.record(type, record));
      });
      nameSectionEl.appendChild(typeEl);
    });
    nameContainerEl.appendChild(nameSectionEl);
    resolverSectionEl.appendChild(nameContainerEl);
    resolverContainerEl.appendChild(resolverSectionEl);
    authoritiativeSectionEl.appendChild(resolverContainerEl);
  });
}

async function queryHash(hash: string) {
  renderAuthoritativeResponses(hash);
  const resolvers = Object.keys(RESOLVER_URL) as ResolverName[];
  const data = await Promise.all(
    [...resolvers].map(
      async (resolver) => await renderDOHResponses(hash, resolver)
    )
  );
}

const hash = window.location.hash.replace("#", "");
const input = document.getElementById("domain-form-input") as HTMLInputElement;

if (hash) {
  queryHash(hash);
  input.value = hash;
}

function reloadPageWithNewHash(e: Event) {
  e.preventDefault();
  window.location.hash = `#${input?.value || ""}`;
  window.location.reload();
}

const darkModeToggle = document.getElementById("dark-mode-toggle");
darkModeToggle?.addEventListener(
  "change",
  () => {
    document.body.classList.toggle("dark");
  },
  false
);

const domainForm = document.getElementById("domain-form");
domainForm?.addEventListener("submit", reloadPageWithNewHash, false);
