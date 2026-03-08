const EXTRA_LOOKUP_HINTS = {
  "carlow-kilkenny": {
    localities: ["carlow", "kilkenny", "bagenalstown"],
    routingKeys: ["R93", "R95"],
  },
  "cavan-monaghan": {
    localities: ["cavan", "monaghan", "carrickmacross"],
    routingKeys: ["H12", "A75"],
  },
  clare: {
    localities: ["ennis", "shannon", "kilrush"],
    routingKeys: ["V95"],
  },
  "cork-east": {
    localities: ["midleton", "mallow", "youghal"],
    routingKeys: ["P25", "P51", "P36"],
  },
  "cork-north-central": {
    localities: ["blackpool", "glanmire", "mayfield"],
    routingKeys: ["T23"],
  },
  "cork-north-west": {
    localities: ["kanturk", "millstreet", "charleville"],
    routingKeys: ["P51", "P67"],
  },
  "cork-south-central": {
    localities: ["cork city", "ballincollig", "douglas"],
    routingKeys: ["T12"],
  },
  "cork-south-west": {
    localities: ["clonakilty", "bantry", "skibbereen"],
    routingKeys: ["P85", "P75", "P81"],
  },
  donegal: {
    localities: ["letterkenny", "donegal town", "buncrana"],
    routingKeys: ["F92", "F94"],
  },
  "dublin-bay-north": {
    localities: ["howth", "raheny", "donaghmede"],
    routingKeys: ["D03", "D05", "D13"],
  },
  "dublin-bay-south": {
    localities: ["ballsbridge", "donnybrook", "ringsend", "sandymount"],
    routingKeys: ["D02", "D04"],
  },
  "dublin-central": {
    localities: ["smithfield", "phibsborough", "cabra"],
    routingKeys: ["D01", "D07"],
  },
  "dublin-fingal-east": {
    localities: ["swords", "malahide", "donabate"],
    routingKeys: ["K67", "K36"],
  },
  "dublin-fingal-west": {
    localities: ["blanchardstown", "mulhuddart", "castleknock"],
    routingKeys: ["D15"],
  },
  "dublin-mid-west": {
    localities: ["clondalkin", "lucan", "palmerstown"],
    routingKeys: ["D22", "D20"],
  },
  "dublin-north-west": {
    localities: ["finglas", "ballymun", "santry"],
    routingKeys: ["D11", "D09"],
  },
  "dublin-rathdown": {
    localities: ["dundrum", "ballinteer", "sandyford"],
    routingKeys: ["D14", "D16", "D18"],
  },
  "dublin-south-central": {
    localities: ["inchicore", "drimnagh", "walkinstown"],
    routingKeys: ["D08", "D10", "D12"],
  },
  "dublin-south-west": {
    localities: ["tallaght", "templeogue", "terenure"],
    routingKeys: ["D24", "D06W", "D06"],
  },
  "dublin-west": {
    localities: ["castleknock", "clonee", "clonsilla"],
    routingKeys: ["D15"],
  },
  "dun-laoghaire": {
    localities: ["dun laoghaire", "blackrock", "dalkey"],
    routingKeys: ["A94", "A96"],
  },
  "galway-east": {
    localities: ["tuam", "loughrea", "ballinasloe"],
    routingKeys: ["H54", "H62", "H53"],
  },
  "galway-west": {
    localities: ["galway city", "salthill", "moycullen"],
    routingKeys: ["H91"],
  },
  kerry: {
    localities: ["tralee", "killarney", "dingle"],
    routingKeys: ["V92", "V93"],
  },
  "kildare-north": {
    localities: ["maynooth", "leixlip", "celbridge"],
    routingKeys: ["W23"],
  },
  "kildare-south": {
    localities: ["naas", "newbridge", "athy"],
    routingKeys: ["W91", "R14"],
  },
  laois: {
    localities: ["portlaoise", "mountmellick", "portarlington"],
    routingKeys: ["R32"],
  },
  "limerick-city": {
    localities: ["limerick city", "castletroy", "corbally"],
    routingKeys: ["V94"],
  },
  "limerick-county": {
    localities: ["newcastle west", "abbeyfeale", "kilmallock"],
    routingKeys: ["V42", "V35"],
  },
  "longford-westmeath": {
    localities: ["athlone", "mullingar", "longford"],
    routingKeys: ["N37", "N91", "N39"],
  },
  louth: {
    localities: ["dundalk", "drogheda", "ardee"],
    routingKeys: ["A91", "A92"],
  },
  mayo: {
    localities: ["castlebar", "ballina", "westport"],
    routingKeys: ["F23", "F26", "F28"],
  },
  "meath-east": {
    localities: ["ashbourne", "ratoath", "dunboyne"],
    routingKeys: ["A84"],
  },
  "meath-west": {
    localities: ["navan", "trim", "kells"],
    routingKeys: ["C15"],
  },
  offaly: {
    localities: ["tullamore", "edenderry", "birr"],
    routingKeys: ["R35", "R45", "R42"],
  },
  "roscommon-galway": {
    localities: ["roscommon", "boyle", "ballaghaderreen"],
    routingKeys: ["F42", "F52", "F45"],
  },
  "sligo-leitrim": {
    localities: ["sligo", "manorhamilton", "carrick-on-shannon"],
    routingKeys: ["F91", "N41"],
  },
  "tipperary-north": {
    localities: ["nenagh", "thurles", "roscrea"],
    routingKeys: ["E45", "E41", "E53"],
  },
  "tipperary-south": {
    localities: ["clonmel", "cahir", "carrick-on-suir"],
    routingKeys: ["E91"],
  },
  waterford: {
    localities: ["waterford city", "tramore", "dungarvan"],
    routingKeys: ["X91", "X42", "X35"],
  },
  wexford: {
    localities: ["wexford town", "enniscorthy", "gorey"],
    routingKeys: ["Y35", "Y21", "Y25"],
  },
  wicklow: {
    localities: ["wicklow town", "bray", "greystones"],
    routingKeys: ["A67", "A98", "A63"],
  },
  "wicklow-wexford": {
    localities: ["arklow", "bunclody", "new ross"],
    routingKeys: ["Y14", "Y21", "Y34"],
  },
};

const LOOKUP_PRECISION_CAPABILITIES = {
  address: "official-handoff-or-best-match-locality",
  constituency: "exact-name",
  eircode: "routing-key",
  query: "best-match-locality",
  town: "best-match-locality",
};
const OFFICIAL_LOOKUP_URL = "https://www.electoralcommission.ie/what-constituency-am-i-in/";
const ADDRESS_STYLE_PATTERN =
  /\b\d+[a-z]?\b|\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|apartment|apt|unit|estate|park|close|court|square|way)\b/i;

function normalizeText(value = "") {
  return `${value}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeToken(value = "") {
  return normalizeText(value).replace(/\s+/g, "-");
}

function extractRoutingKey(value = "") {
  const upperValue = `${value}`.toUpperCase().trim();
  const fullMatch = upperValue.match(/\b([AC-FHKNPRTV-Y]\d{2}|D6W|D\d{2})\s?[0-9AC-FHKNPRTV-Y]{4}\b/);
  if (fullMatch) {
    return fullMatch[1];
  }

  const routingMatch = upperValue.match(/\b(?:D6W|[A-Z]\d{2}|D\d{2})\b/);
  return routingMatch ? routingMatch[0] : null;
}

function looksLikeUnsupportedAddress(value = "") {
  const trimmed = `${value}`.trim();

  if (!trimmed) {
    return false;
  }

  return ADDRESS_STYLE_PATTERN.test(trimmed);
}

function buildLookupIndex(constituencies = []) {
  const routingKeyOwners = constituencies.reduce((owners, constituency) => {
    const hints = EXTRA_LOOKUP_HINTS[constituency.id] || { routingKeys: [] };
    (hints.routingKeys || []).forEach((key) => {
      const normalizedKey = `${key}`.toUpperCase();
      if (!owners.has(normalizedKey)) {
        owners.set(normalizedKey, []);
      }
      owners.get(normalizedKey).push(constituency.id);
    });
    return owners;
  }, new Map());

  return constituencies.map((constituency) => {
    const id = constituency.id;
    const hints = EXTRA_LOOKUP_HINTS[id] || { localities: [], routingKeys: [] };
    const baseTerms = [
      constituency.name,
      constituency.name?.replace(/-/g, " "),
      ...(constituency.searchTerms || []),
      ...(constituency.localIssues || []),
      ...hints.localities,
    ]
      .filter(Boolean)
      .map(normalizeText);

    return {
      ambiguousRoutingKeys: new Set(
        (hints.routingKeys || [])
          .map((key) => `${key}`.toUpperCase())
          .filter((key) => (routingKeyOwners.get(key) || []).length > 1)
      ),
      constituency,
      exactTerms: new Set(baseTerms.filter(Boolean)),
      hintTerms: new Set(
        baseTerms
          .flatMap((term) => term.split(/\s+/))
          .filter((term) => term.length > 2)
      ),
      routingKeys: new Set((hints.routingKeys || []).map((key) => `${key}`.toUpperCase())),
    };
  });
}

function scoreLookup(indexEntry, normalizedQuery, routingKey) {
  let score = 0;
  let matchReason = "fallback-search";
  let ambiguousRoutingKey = false;

  if (routingKey && indexEntry.routingKeys.has(routingKey)) {
    ambiguousRoutingKey = indexEntry.ambiguousRoutingKeys.has(routingKey);
    return {
      ambiguousRoutingKey,
      confidence: ambiguousRoutingKey ? "medium" : "high",
      matchReason: `routing-key:${routingKey}`,
      score: ambiguousRoutingKey ? 95 : 120,
    };
  }

  if (!normalizedQuery) {
    return { confidence: "low", matchReason, score };
  }

  if (indexEntry.exactTerms.has(normalizedQuery)) {
    return { confidence: "high", matchReason: "exact-term", score: 100 };
  }

  const haystack = Array.from(indexEntry.exactTerms).join(" ");

  if (haystack.includes(normalizedQuery)) {
    score += 70;
    matchReason = "contains-term";
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const tokenHits = queryTokens.filter((token) => indexEntry.hintTerms.has(token)).length;
  if (tokenHits) {
    score += tokenHits * 18;
    matchReason = tokenHits === queryTokens.length ? "token-match" : "partial-token-match";
  }

  return {
    ambiguousRoutingKey,
    confidence: score >= 85 ? "high" : score >= 45 ? "medium" : score > 0 ? "low" : "none",
    matchReason,
    score,
  };
}

function classifyLookupStatus({ blocked, highConfidenceResults, lookupMode, results }) {
  if (blocked) {
    return "blocked";
  }

  if (!results.length) {
    return "no-match";
  }

  if (lookupMode === "eircode") {
    return highConfidenceResults.length === 1 ? "resolved" : "ambiguous";
  }

  return highConfidenceResults.length === 1 ? "resolved" : "ambiguous";
}

function lookupConstituencies(constituencies = [], params = {}) {
  const queryValue = `${params.eircode || params.address || params.query || ""}`.trim();
  const normalizedQuery = normalizeText(queryValue);
  const routingKey = extractRoutingKey(queryValue);
  const unsupportedAddress = Boolean(params.address) && looksLikeUnsupportedAddress(queryValue);
  const lookupMode = params.eircode
    ? "eircode"
    : params.address
      ? "address"
      : params.query && !normalizedQuery.includes(" ")
        ? "town"
        : routingKey
          ? "eircode"
          : "query";
  const lookupPrecision =
    LOOKUP_PRECISION_CAPABILITIES[lookupMode] ||
    LOOKUP_PRECISION_CAPABILITIES.query ||
    "best-match-locality";

  if (unsupportedAddress) {
    return {
      autoAppliedEligible: false,
      blocked: true,
      fallbackUsed: false,
      handoff: {
        label: "Use the Electoral Commission constituency finder",
        reason:
          "Politiclear does not claim exact address-level constituency resolution. Use the official tool for full address lookup.",
        url: OFFICIAL_LOOKUP_URL,
      },
      lookupConfidence: "none",
      lookupMatchReason: "official-handoff-required",
      lookupPrecisionCapabilities: LOOKUP_PRECISION_CAPABILITIES,
      lookupPrecision: "unsupported-address",
      lookupMode,
      matchKind: "blocked",
      normalizedQuery,
      officialEquivalent: false,
      results: [],
      routingKey,
      selectedResult: null,
      status: "blocked",
    };
  }

  const indexed = buildLookupIndex(constituencies);
  const ranked = indexed
    .map((indexEntry) => {
      const match = scoreLookup(indexEntry, normalizedQuery, routingKey);
      return {
        ambiguousRoutingKey: Boolean(match.ambiguousRoutingKey),
        confidence: match.confidence,
        constituency: indexEntry.constituency,
        matchReason: match.matchReason,
        score: match.score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.constituency.name.localeCompare(right.constituency.name));

  const results = ranked.map((entry) => ({
    ...entry.constituency,
    lookupMatchKind:
      lookupMode === "eircode"
        ? entry.ambiguousRoutingKey
          ? "ambiguous-routing-key"
          : "routing-key"
        : entry.confidence === "high"
        ? "exact"
        : entry.confidence === "medium" || entry.confidence === "low"
          ? "best"
          : "fallback",
    isAmbiguousCandidate: Boolean(entry.ambiguousRoutingKey),
    lookupConfidence: entry.confidence,
    lookupMatchReason: entry.matchReason,
    lookupMode,
    lookupPrecision:
      lookupMode === "eircode"
        ? entry.ambiguousRoutingKey
          ? "ambiguous-routing-key"
          : "routing-key"
        : lookupPrecision,
    officialEquivalent:
      lookupMode === "query" &&
      entry.confidence === "high" &&
      normalizeText(entry.constituency.name) === normalizedQuery,
  }));

  const topResult = ranked[0] || null;
  const highConfidenceResults = results.filter((result) => result.lookupConfidence === "high");
  const status = classifyLookupStatus({
    blocked: false,
    highConfidenceResults,
    lookupMode,
    results,
  });
  const selectedResult =
    status === "resolved"
      ? results.find((result) => result.lookupConfidence === "high") || results[0] || null
      : null;
  const matchKind = topResult
    ? topResult.confidence === "high"
      ? "exact"
      : "best"
    : "fallback";
  const lookupConfidence = topResult?.confidence || "none";
  const lookupMatchReason = topResult?.matchReason || "no-match";

  return {
    autoAppliedEligible: Boolean(
      status === "resolved" &&
        selectedResult?.id &&
        !selectedResult.isAmbiguousCandidate
    ),
    blocked: false,
    fallbackUsed: results.length === 0,
    lookupConfidence,
    lookupMatchReason,
    lookupPrecisionCapabilities: LOOKUP_PRECISION_CAPABILITIES,
    lookupPrecision,
    lookupMode,
    matchKind,
    normalizedQuery,
    officialEquivalent: Boolean(
      selectedResult &&
        lookupMode === "query" &&
        normalizeText(selectedResult.name) === normalizedQuery
    ),
    results,
    routingKey,
    selectedResult,
    status,
  };
}

module.exports = {
  OFFICIAL_LOOKUP_URL,
  LOOKUP_PRECISION_CAPABILITIES,
  lookupConstituencies,
  normalizeToken,
};
