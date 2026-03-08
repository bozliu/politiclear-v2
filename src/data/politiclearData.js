const TODAY = "2026-03-06";

const makeSource = (label, url, note, type = "official") => ({
  label,
  note,
  type,
  url,
});

const officialResourceLinks = [
  makeSource(
    "What constituency am I in?",
    "https://www.electoralcommission.ie/what-constituency-am-i-in/",
    "Official Electoral Commission constituency lookup."
  ),
  makeSource(
    "Who are my TDs?",
    "https://www.electoralcommission.ie/who-are-my-tds/",
    "Official Electoral Commission representative lookup."
  ),
  makeSource(
    "Register to vote",
    "https://www.electoralcommission.ie/register-to-vote/",
    "Registration guidance and next actions."
  ),
  makeSource(
    "Check the register",
    "https://www.electoralcommission.ie/check-the-register/",
    "Official register checker landing page."
  ),
  makeSource(
    "Voter eligibility",
    "https://www.electoralcommission.ie/voter-eligibility/",
    "Official nationality and election eligibility rules."
  ),
  makeSource(
    "Ireland's voting system",
    "https://www.electoralcommission.ie/irelands-voting-system/",
    "Official guide to PR-STV and ballot ranking."
  ),
  makeSource(
    "Register of political parties",
    "https://www.electoralcommission.ie/publications/register-of-political-parties/",
    "Registered party list and official publication."
  ),
  makeSource(
    "Oireachtas open data",
    "https://data.oireachtas.ie/",
    "Official parliamentary open data entrypoint."
  ),
  makeSource(
    "OSi constituency boundaries 2023",
    "https://data-osi.opendata.arcgis.com/datasets/osi::constituency-boundaries-ungeneralised-national-electoral-boundaries-2023",
    "Boundary source for future geo search and maps."
  ),
  makeSource(
    "CSO data portal",
    "https://data.cso.ie/",
    "Population and regional context data."
  ),
];

export const parties = {
  labour: {
    id: "labour",
    name: "Labour Party",
    shortLabel: "Labour",
    officialLinks: [
      makeSource(
        "Labour Party",
        "https://labour.ie/",
        "Official party site.",
        "party"
      ),
    ],
  },
  fineGael: {
    id: "fineGael",
    name: "Fine Gael",
    shortLabel: "Fine Gael",
    officialLinks: [
      makeSource(
        "Fine Gael",
        "https://www.finegael.ie/",
        "Official party site.",
        "party"
      ),
    ],
  },
  fiannaFail: {
    id: "fiannaFail",
    name: "Fianna Fáil",
    shortLabel: "Fianna Fáil",
    officialLinks: [
      makeSource(
        "Fianna Fáil",
        "https://www.fiannafail.ie/",
        "Official party site.",
        "party"
      ),
    ],
  },
  sinnFein: {
    id: "sinnFein",
    name: "Sinn Féin",
    shortLabel: "Sinn Féin",
    officialLinks: [
      makeSource(
        "Sinn Féin",
        "https://vote.sinnfein.ie/",
        "Official party campaign and policy hub.",
        "party"
      ),
    ],
  },
  socialDemocrats: {
    id: "socialDemocrats",
    name: "Social Democrats",
    shortLabel: "Social Democrats",
    officialLinks: [
      makeSource(
        "Social Democrats",
        "https://www.socialdemocrats.ie/",
        "Official party site.",
        "party"
      ),
    ],
  },
  independent: {
    id: "independent",
    name: "Independent",
    shortLabel: "Independent",
    officialLinks: [
      makeSource(
        "Independent politics in Ireland",
        "https://www.oireachtas.ie/en/members/",
        "Use the Oireachtas directory for current public profiles."
      ),
    ],
  },
  pending: {
    id: "pending",
    name: "Party data pending sync",
    shortLabel: "Pending sync",
    officialLinks: [
      makeSource(
        "Register of political parties",
        "https://www.electoralcommission.ie/publications/register-of-political-parties/",
        "Use the official party register while this profile is being refreshed."
      ),
    ],
  },
};

export const issueCatalog = [
  {
    id: "housing",
    label: "Housing",
    prompt: "What has this public figure said or done on housing supply and affordability?",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    prompt: "How does the public record frame healthcare access and service delivery?",
  },
  {
    id: "cost-of-living",
    label: "Cost of living",
    prompt: "What signals exist on prices, household costs, and income pressure?",
  },
  {
    id: "transport",
    label: "Transport",
    prompt: "How does this profile approach local mobility, roads, and public transport?",
  },
  {
    id: "climate",
    label: "Climate",
    prompt: "What is on record about climate and environmental commitments?",
  },
  {
    id: "rural-services",
    label: "Rural services",
    prompt: "What is the public record on rural access, connectivity, and local services?",
  },
  {
    id: "education",
    label: "Education",
    prompt: "What has been highlighted on schools, skills, or student supports?",
  },
  {
    id: "governance",
    label: "Governance",
    prompt: "What is on record around transparency, accountability, and parliamentary reform?",
  },
];

const issueLookup = issueCatalog.reduce((accumulator, issue) => {
  accumulator[issue.id] = issue;
  return accumulator;
}, {});

export const constituencies = [
  {
    id: "dublin-bay-south",
    name: "Dublin Bay South",
    seats: 4,
    summary:
      "Urban constituency with strong focus on housing pressure, transport access, and public services.",
    localIssues: ["Housing delivery", "Bus and active travel", "Healthcare access"],
    searchTerms: ["dublin", "dbs", "dublin bay south"],
    updatedAt: TODAY,
    officialLinks: [
      officialResourceLinks[0],
      officialResourceLinks[1],
      makeSource(
        "2024 general election overview",
        "https://www.oireachtas.ie/en/elections/",
        "Official elections landing page for national context."
      ),
    ],
  },
  {
    id: "kerry",
    name: "Kerry",
    seats: 5,
    summary:
      "Large rural constituency where connectivity, agriculture, coastal resilience, and local services dominate.",
    localIssues: ["Rural roads", "Tourism and jobs", "Coastal resilience"],
    searchTerms: ["kerry", "tralee", "killarney"],
    updatedAt: TODAY,
    officialLinks: [
      officialResourceLinks[0],
      officialResourceLinks[1],
      makeSource(
        "CSO regional data",
        "https://data.cso.ie/",
        "Use CSO for constituency context and local indicators."
      ),
    ],
  },
  {
    id: "donegal",
    name: "Donegal",
    seats: 5,
    summary:
      "Border and coastal constituency with recurring concerns around health access, fisheries, and regional investment.",
    localIssues: ["Regional healthcare", "Fisheries", "Cross-border connectivity"],
    searchTerms: ["donegal", "letterkenny", "inishowen"],
    updatedAt: TODAY,
    officialLinks: [
      officialResourceLinks[0],
      officialResourceLinks[1],
      makeSource(
        "OSi boundary data",
        "https://data-osi.opendata.arcgis.com/datasets/osi::constituency-boundaries-ungeneralised-national-electoral-boundaries-2023",
        "Useful for future map-based boundary exploration."
      ),
    ],
  },
  {
    id: "galway-west",
    name: "Galway West",
    seats: 5,
    summary:
      "Mixed urban and rural constituency balancing housing, transport, higher education, and regional development.",
    localIssues: ["Housing affordability", "Regional transport", "University and skills pipeline"],
    searchTerms: ["galway", "galway west", "salthill"],
    updatedAt: TODAY,
    officialLinks: [
      officialResourceLinks[0],
      officialResourceLinks[1],
      makeSource(
        "CSO data portal",
        "https://data.cso.ie/",
        "Latest official statistical context."
      ),
    ],
  },
];

const constituencyLookup = constituencies.reduce((accumulator, constituency) => {
  accumulator[constituency.id] = constituency;
  return accumulator;
}, {});

export const defaultConstituencyId = "dublin-bay-south";

const partyLinks = (partyId) => parties[partyId]?.officialLinks || [];

const linkOireachtas = (memberSlug) =>
  makeSource(
    "Oireachtas profile",
    "https://www.oireachtas.ie/en/members/",
    `Official parliamentary members directory. Search for ${memberSlug} in the official directory.`,
    "official"
  );

const constituencyOfficialSources = (constituencyId) =>
  constituencyLookup[constituencyId]?.officialLinks || [];

const buildIssue = ({
  issueId,
  stance,
  summary,
  source,
  evidenceLabel,
}) => ({
  evidenceLabel,
  issueId,
  label: issueLookup[issueId].label,
  source,
  stance,
  summary,
});

const buildCandidate = ({
  id,
  name,
  partyId,
  constituencyId,
  summary,
  overview,
  keyIssues,
  activity,
  officialLinks,
}) => {
  const party = parties[partyId] || parties.pending;
  const constituency = constituencyLookup[constituencyId];
  const sources = [
    ...officialLinks,
    ...partyLinks(party.id),
    ...constituencyOfficialSources(constituencyId),
  ].filter(Boolean);

  return {
    activity,
    constituencyId,
    constituencyName: constituency.name,
    id,
    isIncumbent: true,
    keyIssues,
    lastUpdated: TODAY,
    name,
    officialLinks,
    overview,
    party: party.name,
    partyId: party.id,
    sourceNote:
      "Politiclear surfaces party platforms and public parliamentary records. Review primary sources before making a final decision.",
    sources,
    statusLabel: "TD",
    summary,
  };
};

export const candidates = [
  buildCandidate({
    id: "ivana-bacik",
    name: "Ivana Bacik",
    partyId: "labour",
    constituencyId: "dublin-bay-south",
    summary:
      "Labour leader profile centered on public services, civil liberties, and housing pressure in Dublin Bay South.",
    overview:
      "This card combines Ivana Bacik's official profile with party material and constituency context. Use it as a starting point, not a substitute for primary sources.",
    officialLinks: [
      linkOireachtas("Ivana-Bacik.D.2024-11-29"),
      makeSource(
        "Labour candidate page",
        "https://labour.ie/people/ivana-bacik/",
        "Official party profile.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "Publicly frames housing as a supply, affordability, and renter-security issue.",
        summary:
          "Labour material and recent constituency campaigning foreground faster delivery and stronger protections for renters.",
        evidenceLabel: "Labour profile",
        source: makeSource(
          "Labour Party",
          "https://labour.ie/people/ivana-bacik/",
          "Official profile and campaign priorities.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "healthcare",
        stance: "Positions healthcare access and waiting lists as core public-service concerns.",
        summary:
          "Official Labour messaging and parliamentary work consistently tie local quality of life to accessible health services.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Labour Party",
          "https://labour.ie/",
          "Official party policy entrypoint.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "governance",
        stance: "Public record emphasizes rights, accountability, and scrutiny of government decisions.",
        summary:
          "The Oireachtas profile and public role description support using governance and rights as major watchpoints.",
        evidenceLabel: "Oireachtas profile",
        source: linkOireachtas("Ivana-Bacik.D.2024-11-29"),
      }),
    ],
    activity: [
      {
        title: "Public role snapshot",
        summary:
          "Official profile confirms current parliamentary membership and provides direct source material for further review.",
        source: linkOireachtas("Ivana-Bacik.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "james-geoghegan",
    name: "James Geoghegan",
    partyId: "fineGael",
    constituencyId: "dublin-bay-south",
    summary:
      "Fine Gael profile focused on jobs, service delivery, and practical local issues in Dublin Bay South.",
    overview:
      "James Geoghegan's card uses official parliamentary and party sources plus constituency context. Review the linked primary sources for detail.",
    officialLinks: [
      linkOireachtas("James-Geoghegan.D.2024-11-29"),
      makeSource(
        "Fine Gael",
        "https://www.finegael.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "Frames housing through delivery, planning certainty, and local infrastructure.",
        summary:
          "Fine Gael messaging generally links housing throughput to planning reform and delivery discipline.",
        evidenceLabel: "Fine Gael",
        source: makeSource(
          "Fine Gael",
          "https://www.finegael.ie/",
          "Official party policy landing page.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "transport",
        stance: "Public-facing messaging often emphasizes reliable local transport and safer streets.",
        summary:
          "Constituency-facing priorities in Dublin Bay South consistently connect local mobility to business and quality-of-life concerns.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[1],
      }),
      buildIssue({
        issueId: "education",
        stance: "Frames schools and local services as part of long-term economic confidence.",
        summary:
          "This is a party-platform-led summary pending a fuller sync of recent speeches and questions.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Fine Gael",
          "https://www.finegael.ie/",
          "Official party site.",
          "party"
        ),
      }),
    ],
    activity: [
      {
        title: "Official parliamentary entry",
        summary:
          "The Oireachtas profile is the best primary source for current membership confirmation and future speech tracking.",
        source: linkOireachtas("James-Geoghegan.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "eoin-hayes",
    name: "Eoin Hayes",
    partyId: "socialDemocrats",
    constituencyId: "dublin-bay-south",
    summary:
      "Social Democrats profile focused on clean governance, housing pressure, and stronger public services.",
    overview:
      "This record is intentionally conservative about claims. It prioritizes public links and flags where richer issue sync is still pending.",
    officialLinks: [
      linkOireachtas("Eoin-Hayes.D.2024-11-29"),
      makeSource(
        "Social Democrats",
        "https://www.socialdemocrats.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "Public-facing summary emphasizes affordability and delivery capacity.",
        summary:
          "Social Democrats policy framing usually ties housing reform to affordability, supply, and service planning.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Social Democrats",
          "https://www.socialdemocrats.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "governance",
        stance: "Governance and accountability are core watchpoints in this profile.",
        summary:
          "This card intentionally highlights transparency because official party and public commentary consistently return to that theme.",
        evidenceLabel: "Official party source",
        source: makeSource(
          "Social Democrats",
          "https://www.socialdemocrats.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "healthcare",
        stance: "Frames public healthcare as a service-capacity issue tied to fairness and access.",
        summary:
          "Use the official party source and Oireachtas profile as the current evidence base while richer record sync is pending.",
        evidenceLabel: "Oireachtas + party",
        source: linkOireachtas("Eoin-Hayes.D.2024-11-29"),
      }),
    ],
    activity: [
      {
        title: "Sync note",
        summary:
          "Detailed recent-activity extraction is still pending, so this card leans on official profile and party material for now.",
        source: linkOireachtas("Eoin-Hayes.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "jim-ocallaghan",
    name: "Jim O'Callaghan",
    partyId: "fiannaFail",
    constituencyId: "dublin-bay-south",
    summary:
      "Fianna Fáil profile focused on delivery, public safety, and service performance in Dublin Bay South.",
    overview:
      "Politiclear presents this card as a public-record summary tied to party material and official parliamentary sources.",
    officialLinks: [
      linkOireachtas("Jim-O-Callaghan.D.2024-11-29"),
      makeSource(
        "Fianna Fáil",
        "https://www.fiannafail.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "Frames housing as a delivery and affordability challenge requiring faster output.",
        summary:
          "This summary reflects party-level housing framing plus local public-service expectations in Dublin Bay South.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Fianna Fáil",
          "https://www.fiannafail.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "governance",
        stance: "Public profile puts parliamentary and legal scrutiny in focus.",
        summary:
          "Use the official Oireachtas page for direct public record and future contribution tracking.",
        evidenceLabel: "Oireachtas profile",
        source: linkOireachtas("Jim-O-Callaghan.D.2024-11-29"),
      }),
      buildIssue({
        issueId: "transport",
        stance: "Frames local connectivity as part of day-to-day service delivery rather than abstract infrastructure alone.",
        summary:
          "This is a constituency-focused summary based on local issue patterns and official reference links.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[1],
      }),
    ],
    activity: [
      {
        title: "Official parliamentary entry",
        summary:
          "The Oireachtas member page is the primary source for current role, contributions, and future record checking.",
        source: linkOireachtas("Jim-O-Callaghan.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "michael-cahill",
    name: "Michael Cahill",
    partyId: "fiannaFail",
    constituencyId: "kerry",
    summary:
      "Kerry profile centered on local services, enterprise, and practical rural delivery.",
    overview:
      "This profile is built from official membership confirmation plus party material and Kerry-specific public priorities.",
    officialLinks: [
      linkOireachtas("Michael-Cahill.D.2024-11-29"),
      makeSource(
        "Fianna Fáil",
        "https://www.fiannafail.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "rural-services",
        stance: "Frames rural service access as central to balanced regional growth.",
        summary:
          "Party and constituency context point to road access, local services, and rural connectivity as core concerns.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "housing",
        stance: "Public summary emphasizes delivery outside the main cities, not only metropolitan supply.",
        summary:
          "Kerry coverage makes local housing delivery and affordability part of a wider regional development story.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Fianna Fáil",
          "https://www.fiannafail.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "transport",
        stance: "Frames roads and local connectivity as economic enablers.",
        summary:
          "This card uses rural and tourism-linked transport as the main verified transport lens for Kerry.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "Use the Oireachtas page to verify current parliamentary membership and any later speech or question sync.",
        source: linkOireachtas("Michael-Cahill.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "danny-healy-rae",
    name: "Danny Healy-Rae",
    partyId: "independent",
    constituencyId: "kerry",
    summary:
      "Independent profile strongly associated with rural access, roads, and local service pressure in Kerry.",
    overview:
      "This card keeps the framing narrow and source-led: roads, rural mobility, and local service advocacy recur most often.",
    officialLinks: [linkOireachtas("Danny-Healy-Rae.D.2024-11-29")],
    keyIssues: [
      buildIssue({
        issueId: "rural-services",
        stance: "Public record consistently focuses on local and rural service access.",
        summary:
          "This is the strongest recurring theme tied to the official parliamentary profile and longstanding constituency context.",
        evidenceLabel: "Oireachtas profile",
        source: linkOireachtas("Danny-Healy-Rae.D.2024-11-29"),
      }),
      buildIssue({
        issueId: "transport",
        stance: "Road quality and local transport reliability remain central.",
        summary:
          "Use this as a practical transport lens rather than a nationwide mobility framework.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[1],
      }),
      buildIssue({
        issueId: "cost-of-living",
        stance: "Frames everyday affordability through fuel, travel, and household pressure.",
        summary:
          "This summary is derived from rural-living context and public issue emphasis, not a full manifesto sync.",
        evidenceLabel: "Contextual summary",
        source: officialResourceLinks[9],
      }),
    ],
    activity: [
      {
        title: "Public record watch",
        summary:
          "Roads and rural access are the most visible recurring themes to track in future speech sync.",
        source: linkOireachtas("Danny-Healy-Rae.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "michael-healy-rae",
    name: "Michael Healy-Rae",
    partyId: "independent",
    constituencyId: "kerry",
    summary:
      "Independent Kerry profile focused on local advocacy, transport, and rural delivery.",
    overview:
      "The evidence base here is deliberately modest: official parliamentary profile plus verified constituency context.",
    officialLinks: [linkOireachtas("Michael-Healy-Rae.D.2024-11-29")],
    keyIssues: [
      buildIssue({
        issueId: "transport",
        stance: "Frames transport through roads, safety, and local connectivity.",
        summary:
          "This remains the clearest practical issue area surfaced by public record and constituency expectations.",
        evidenceLabel: "Oireachtas profile",
        source: linkOireachtas("Michael-Healy-Rae.D.2024-11-29"),
      }),
      buildIssue({
        issueId: "rural-services",
        stance: "Strong local-service orientation with emphasis on keeping rural communities connected.",
        summary:
          "The card prioritizes local-service delivery rather than broad national policy abstraction.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "cost-of-living",
        stance: "Public framing often centers day-to-day cost burdens on rural households.",
        summary:
          "Treat this as a constituency-led summary backed by public profile and local context.",
        evidenceLabel: "Contextual summary",
        source: officialResourceLinks[9],
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "Use the Oireachtas entry as the authoritative baseline for future speech and vote sync.",
        source: linkOireachtas("Michael-Healy-Rae.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "norma-foley",
    name: "Norma Foley",
    partyId: "fiannaFail",
    constituencyId: "kerry",
    summary:
      "Fianna Fáil Kerry profile centered on education, public services, and regional delivery.",
    overview:
      "This card links a ministerial/public-service lens with Kerry-specific service and connectivity concerns.",
    officialLinks: [
      linkOireachtas("Norma-Foley.D.2024-11-29"),
      makeSource(
        "Fianna Fáil",
        "https://www.fiannafail.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "education",
        stance: "Education remains a lead watchpoint in this public profile.",
        summary:
          "School supports, skills, and service delivery are the most defensible top-line themes from the public record.",
        evidenceLabel: "Oireachtas profile",
        source: linkOireachtas("Norma-Foley.D.2024-11-29"),
      }),
      buildIssue({
        issueId: "rural-services",
        stance: "Frames regional equity through service access beyond Dublin.",
        summary:
          "This summary blends official profile context with Fianna Fáil's regional-delivery messaging.",
        evidenceLabel: "Party + profile",
        source: makeSource(
          "Fianna Fáil",
          "https://www.fiannafail.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "housing",
        stance: "Approaches housing through delivery and public-service planning.",
        summary:
          "Use official party material for detailed housing policy beyond this brief summary.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Fianna Fáil",
          "https://www.fiannafail.ie/",
          "Official party site.",
          "party"
        ),
      }),
    ],
    activity: [
      {
        title: "Education and services lens",
        summary:
          "Track this profile through official parliamentary updates for newer education and service-delivery contributions.",
        source: linkOireachtas("Norma-Foley.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "pa-daly",
    name: "Pa Daly",
    partyId: "sinnFein",
    constituencyId: "kerry",
    summary:
      "Sinn Féin Kerry profile focused on affordability, public services, and regional fairness.",
    overview:
      "This card uses party platform framing plus official parliamentary references. Review original sources before relying on any one summary.",
    officialLinks: [
      linkOireachtas("Pa-Daly.D.2024-11-29"),
      makeSource(
        "Sinn Féin",
        "https://vote.sinnfein.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "Frames housing primarily through affordability, supply, and tenant pressure.",
        summary:
          "Sinn Féin's public platform keeps housing near the center of cost-of-living and public-service politics.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "healthcare",
        stance: "Links local wellbeing to stronger public healthcare access.",
        summary:
          "This is a party-led summary that should be checked against future parliamentary contribution sync.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "rural-services",
        stance: "Frames rural fairness as a service and investment question.",
        summary:
          "Kerry context makes regional balance and service provision especially relevant in this profile.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "Use the Oireachtas profile to confirm current role and track later activity in detail.",
        source: linkOireachtas("Pa-Daly.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "pat-the-cope-gallagher",
    name: "Pat The Cope Gallagher",
    partyId: "fiannaFail",
    constituencyId: "donegal",
    summary:
      "Donegal profile centered on regional investment, fisheries, and local service access.",
    overview:
      "This card highlights the most stable public themes for Donegal: regional delivery, coastal livelihoods, and cross-border connectivity.",
    officialLinks: [
      linkOireachtas("Pat-The-Cope-Gallagher.D.2024-11-29"),
      makeSource(
        "Fianna Fáil",
        "https://www.fiannafail.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "rural-services",
        stance: "Frames regional fairness through delivery outside the main urban centers.",
        summary:
          "Donegal's public debate makes local services and distance-to-access a recurring test for representatives.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "transport",
        stance: "Treats connectivity as a regional development issue.",
        summary:
          "The constituency context makes roads and connectivity a major lens for economic opportunity.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[1],
      }),
      buildIssue({
        issueId: "cost-of-living",
        stance: "Public framing often ties household pressure to distance and regional service access.",
        summary:
          "This summary is based on regional public context and party platform signals rather than a single speech.",
        evidenceLabel: "Contextual summary",
        source: makeSource(
          "Fianna Fáil",
          "https://www.fiannafail.ie/",
          "Official party site.",
          "party"
        ),
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "The Oireachtas profile is the primary source for current role verification and later speech tracking.",
        source: linkOireachtas("Pat-The-Cope-Gallagher.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "pearse-doherty",
    name: "Pearse Doherty",
    partyId: "sinnFein",
    constituencyId: "donegal",
    summary:
      "Sinn Féin Donegal profile strongly associated with cost of living, regional equity, and public-service delivery.",
    overview:
      "This card combines official profile links with party platform context and Donegal-specific issue priorities.",
    officialLinks: [
      linkOireachtas("Pearse-Doherty.D.2024-11-29"),
      makeSource(
        "Sinn Féin",
        "https://vote.sinnfein.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "cost-of-living",
        stance: "Public-facing profile keeps household pressure and affordability front and center.",
        summary:
          "This is one of the clearest high-level themes tied to Pearse Doherty's national and constituency profile.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "housing",
        stance: "Frames housing through affordability, public supply, and delivery pressure.",
        summary:
          "Use primary sources for detail, but housing is a stable watchpoint in both party and constituency context.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "rural-services",
        stance: "Links regional fairness to public-service access in border and coastal communities.",
        summary:
          "Donegal context makes this especially important when comparing representatives.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "Use the Oireachtas profile for current parliamentary status and future record follow-up.",
        source: linkOireachtas("Pearse-Doherty.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "padraig-mac-lochlainn",
    name: "Pádraig Mac Lochlainn",
    partyId: "sinnFein",
    constituencyId: "donegal",
    summary:
      "Donegal Sinn Féin profile focused on community services, fisheries, and regional fairness.",
    overview:
      "This card keeps to what can be defensibly summarized from official links, party framing, and Donegal issue context.",
    officialLinks: [
      linkOireachtas("Padraig-Mac-Lochlainn.D.2024-11-29"),
      makeSource(
        "Sinn Féin",
        "https://vote.sinnfein.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "rural-services",
        stance: "Frames service access and fairness for outlying communities as a core issue.",
        summary:
          "Regional and border realities make local service access central when assessing this profile.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "healthcare",
        stance: "Public summary emphasizes equitable access to services outside the main city centers.",
        summary:
          "This is a constituency-context summary while richer contribution sync is still pending.",
        evidenceLabel: "Contextual summary",
        source: officialResourceLinks[4],
      }),
      buildIssue({
        issueId: "cost-of-living",
        stance: "Links public-service pressure and affordability in a regional context.",
        summary:
          "Treat this as a source-led overview rather than a definitive ranking signal.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "The Oireachtas page remains the most reliable starting point for current role verification.",
        source: linkOireachtas("Padraig-Mac-Lochlainn.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "charlie-mcconalogue",
    name: "Charlie McConalogue",
    partyId: "fiannaFail",
    constituencyId: "donegal",
    summary:
      "Fianna Fáil Donegal profile linked to agriculture, regional delivery, and service access.",
    overview:
      "Donegal public context makes agriculture, regional investment, and service reliability the most useful comparison lens here.",
    officialLinks: [
      linkOireachtas("Charlie-McConalogue.D.2024-11-29"),
      makeSource(
        "Fianna Fáil",
        "https://www.fiannafail.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "rural-services",
        stance: "Frames regional delivery as a baseline fairness issue.",
        summary:
          "This card prioritizes access to services and local delivery as the clearest public-record lens.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "cost-of-living",
        stance: "Public summary links regional costs to distance, service access, and local jobs.",
        summary:
          "Use party material for deeper tax and income positions beyond this top-line summary.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Fianna Fáil",
          "https://www.fiannafail.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "transport",
        stance: "Connectivity is treated as a development issue rather than transport in isolation.",
        summary:
          "This is a practical Donegal lens covering roads, travel time, and business access.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[1],
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "Use the Oireachtas page to confirm role and check future updates in more detail.",
        source: linkOireachtas("Charlie-McConalogue.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "thomas-pringle",
    name: "Thomas Pringle",
    partyId: "independent",
    constituencyId: "donegal",
    summary:
      "Independent Donegal profile focused on local accountability, regional services, and cross-border realities.",
    overview:
      "This card uses a cautious, source-led lens and does not force a party-platform view where one does not exist.",
    officialLinks: [linkOireachtas("Thomas-Pringle.D.2024-11-29")],
    keyIssues: [
      buildIssue({
        issueId: "governance",
        stance: "Independent public profile makes accountability and scrutiny a major comparison area.",
        summary:
          "Without a party manifesto, the official parliamentary record matters even more for this profile.",
        evidenceLabel: "Oireachtas profile",
        source: linkOireachtas("Thomas-Pringle.D.2024-11-29"),
      }),
      buildIssue({
        issueId: "rural-services",
        stance: "Frames remote-service access as a day-to-day constituency issue.",
        summary:
          "Use local service access as the strongest shared context when comparing this record to party candidates.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "healthcare",
        stance: "Regional healthcare access remains a useful accountability lens.",
        summary:
          "This is a constituency-led summary pending more structured extraction of recent parliamentary activity.",
        evidenceLabel: "Contextual summary",
        source: officialResourceLinks[4],
      }),
    ],
    activity: [
      {
        title: "Independent source trail",
        summary:
          "Use the official profile and future speech sync because there is no party platform shortcut here.",
        source: linkOireachtas("Thomas-Pringle.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "catherine-connolly",
    name: "Catherine Connolly",
    partyId: "independent",
    constituencyId: "galway-west",
    summary:
      "Independent Galway West profile focused on parliamentary scrutiny, public services, and civil rights.",
    overview:
      "This card leans on official parliamentary sources because independent profiles require stronger direct record checking.",
    officialLinks: [linkOireachtas("Catherine-Connolly.D.2024-11-29")],
    keyIssues: [
      buildIssue({
        issueId: "governance",
        stance: "Public profile strongly supports using governance and accountability as a comparison lens.",
        summary:
          "Official parliamentary record is especially important here because it is the clearest evidence trail.",
        evidenceLabel: "Oireachtas profile",
        source: linkOireachtas("Catherine-Connolly.D.2024-11-29"),
      }),
      buildIssue({
        issueId: "education",
        stance: "Galway West context makes higher education and public service quality especially relevant.",
        summary:
          "This summary reflects the constituency's strong education footprint and public-service links.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "housing",
        stance: "Housing affordability remains a high-signal local issue to use when comparing representatives.",
        summary:
          "Use linked official resources and future speech sync for more precise record-based detail.",
        evidenceLabel: "Contextual summary",
        source: officialResourceLinks[0],
      }),
    ],
    activity: [
      {
        title: "Independent source trail",
        summary:
          "The Oireachtas profile is the strongest primary source for this record and should anchor deeper review.",
        source: linkOireachtas("Catherine-Connolly.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "john-connolly",
    name: "John Connolly",
    partyId: "fiannaFail",
    constituencyId: "galway-west",
    summary:
      "Fianna Fáil Galway West profile focused on housing, public services, and regional growth.",
    overview:
      "This is a public-record summary grounded in official role confirmation, party material, and Galway West issue context.",
    officialLinks: [
      linkOireachtas("John-Connolly.D.2024-11-29"),
      makeSource(
        "Fianna Fáil",
        "https://www.fiannafail.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "Frames housing delivery and affordability as top public concerns in Galway West.",
        summary:
          "Galway West pressure makes housing an essential comparison row, even when this card stays source-conservative.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Fianna Fáil",
          "https://www.fiannafail.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "education",
        stance: "Higher education, skills, and local service quality remain relevant lenses.",
        summary:
          "This ties party public-service framing to Galway's education footprint and jobs pipeline.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
      buildIssue({
        issueId: "transport",
        stance: "Treats transport as part of regional growth and daily access.",
        summary:
          "Use official constituency lookup and future record sync for deeper transport-specific evidence.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[1],
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "Use the Oireachtas page to confirm role and follow later speeches, questions, and votes.",
        source: linkOireachtas("John-Connolly.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "mairead-farrell",
    name: "Mairéad Farrell",
    partyId: "sinnFein",
    constituencyId: "galway-west",
    summary:
      "Sinn Féin Galway West profile focused on housing pressure, public services, and affordability.",
    overview:
      "This card pairs official profile sources with party platform material and Galway West constituency context.",
    officialLinks: [
      linkOireachtas("Mairead-Farrell.D.2024-11-29"),
      makeSource(
        "Sinn Féin",
        "https://vote.sinnfein.ie/",
        "Official party site.",
        "party"
      ),
    ],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "Frames housing as an affordability and supply crisis affecting day-to-day life.",
        summary:
          "This remains one of the clearest party-platform-led comparison themes for Galway West.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "healthcare",
        stance: "Publicly links service pressure to the need for stronger public healthcare delivery.",
        summary:
          "Use the party platform and official profile as current primary sources.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
      buildIssue({
        issueId: "cost-of-living",
        stance: "Treats household affordability as a core public concern across sectors.",
        summary:
          "This row is especially useful when comparing parties on immediate household pressure.",
        evidenceLabel: "Party platform",
        source: makeSource(
          "Sinn Féin",
          "https://vote.sinnfein.ie/",
          "Official party site.",
          "party"
        ),
      }),
    ],
    activity: [
      {
        title: "Official membership source",
        summary:
          "The Oireachtas page provides the authoritative base for future vote and speech tracking.",
        source: linkOireachtas("Mairead-Farrell.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "noel-grealish",
    name: "Noel Grealish",
    partyId: "independent",
    constituencyId: "galway-west",
    summary:
      "Independent Galway West profile focused on local business, transport access, and constituency-level delivery.",
    overview:
      "This summary stays intentionally grounded in constituency context and official profile references.",
    officialLinks: [linkOireachtas("Noel-Grealish.D.2024-11-29")],
    keyIssues: [
      buildIssue({
        issueId: "transport",
        stance: "Frames transport as a practical access and local-economy issue.",
        summary:
          "Road reliability and day-to-day connectivity are the strongest transport lens for this profile.",
        evidenceLabel: "Constituency context",
        source: officialResourceLinks[1],
      }),
      buildIssue({
        issueId: "housing",
        stance: "Treats planning and delivery as part of wider regional growth pressure.",
        summary:
          "Use linked official sources to keep this summary grounded and update it when more record sync lands.",
        evidenceLabel: "Contextual summary",
        source: officialResourceLinks[0],
      }),
      buildIssue({
        issueId: "rural-services",
        stance: "Balances Galway city's growth with surrounding service-access needs.",
        summary:
          "The mixed urban-rural shape of Galway West makes this a useful comparison category.",
        evidenceLabel: "Regional context",
        source: officialResourceLinks[9],
      }),
    ],
    activity: [
      {
        title: "Independent source trail",
        summary:
          "Use the official parliamentary profile as the main anchor while party-platform shortcuts are unavailable.",
        source: linkOireachtas("Noel-Grealish.D.2024-11-29"),
      },
    ],
  }),
  buildCandidate({
    id: "john-maher",
    name: "John Maher",
    partyId: "pending",
    constituencyId: "galway-west",
    summary:
      "Galway West profile pending a fuller party and issue sync. This card prioritizes official links over weak guesses.",
    overview:
      "Politiclear intentionally labels this profile as pending sync rather than guessing a party line or issue stance from thin evidence.",
    officialLinks: [linkOireachtas("John-Maher.D.2024-11-29")],
    keyIssues: [
      buildIssue({
        issueId: "housing",
        stance: "No verified issue summary yet.",
        summary:
          "Use the official Oireachtas profile and constituency context while this card is being refreshed.",
        evidenceLabel: "Pending sync",
        source: linkOireachtas("John-Maher.D.2024-11-29"),
      }),
      buildIssue({
        issueId: "transport",
        stance: "No verified issue summary yet.",
        summary:
          "Galway West transport remains relevant, but Politiclear is not assigning a detailed stance without stronger sourcing.",
        evidenceLabel: "Pending sync",
        source: officialResourceLinks[1],
      }),
      buildIssue({
        issueId: "education",
        stance: "No verified issue summary yet.",
        summary:
          "This is deliberately conservative until a better official source set is attached.",
        evidenceLabel: "Pending sync",
        source: officialResourceLinks[9],
      }),
    ],
    activity: [
      {
        title: "Pending source refresh",
        summary:
          "This profile is intentionally incomplete rather than speculative. Use the official Oireachtas page for now.",
        source: linkOireachtas("John-Maher.D.2024-11-29"),
      },
    ],
  }),
];

const candidateLookup = candidates.reduce((accumulator, candidate) => {
  accumulator[candidate.id] = candidate;
  return accumulator;
}, {});

export const checklistSections = [
  {
    id: "registration",
    title: "Registration",
    description:
      "Make sure you are on the register before comparing candidates in depth.",
    items: [
      {
        id: "check-register",
        label: "Check the register",
        note: "Start with the official register checker.",
        link: officialResourceLinks[3],
      },
      {
        id: "register-to-vote",
        label: "Register or update your details",
        note: "Official steps for a new registration or address change.",
        link: officialResourceLinks[2],
      },
    ],
  },
  {
    id: "ballot-ready",
    title: "Ballot ready",
    description:
      "Use official information to avoid ballot confusion, especially if this is your first PR-STV election.",
    items: [
      {
        id: "understand-pr-stv",
        label: "Read the PR-STV guide",
        note: "Official explanation of ranking candidates in order of preference.",
        link: officialResourceLinks[5],
      },
      {
        id: "find-constituency",
        label: "Confirm your constituency",
        note: "Double-check that you are comparing the right local profiles.",
        link: officialResourceLinks[0],
      },
    ],
  },
  {
    id: "polling-day",
    title: "Polling day",
    description:
      "Keep the practical tasks visible so the app helps you act, not just read.",
    items: [
      {
        id: "where-to-vote",
        label: "Where do I vote?",
        note: "Official polling-location guide.",
        link: makeSource(
          "Where to vote",
          "https://www.electoralcommission.ie/where-to-vote/",
          "Official polling-station entrypoint."
        ),
      },
      {
        id: "who-are-my-tds",
        label: "Review local representatives",
        note: "Use the official directory to cross-check names and spellings.",
        link: officialResourceLinks[1],
      },
    ],
  },
];

export const eligibilityFlow = {
  startQuestionId: "age",
  questions: {
    age: {
      id: "age",
      title: "Are you aged 18 or over?",
      answers: [
        { label: "Yes", nextQuestionId: "irish-citizen" },
        { label: "No", resultId: "under-18" },
      ],
    },
    "irish-citizen": {
      id: "irish-citizen",
      title: "Are you an Irish citizen?",
      answers: [
        { label: "Yes", resultId: "irish-citizen" },
        { label: "No", nextQuestionId: "british-citizen" },
      ],
    },
    "british-citizen": {
      id: "british-citizen",
      title: "Are you a British citizen?",
      answers: [
        { label: "Yes", resultId: "british-citizen" },
        { label: "No", nextQuestionId: "eu-citizen" },
      ],
    },
    "eu-citizen": {
      id: "eu-citizen",
      title: "Are you a citizen of another EU member state?",
      answers: [
        { label: "Yes", resultId: "eu-citizen" },
        { label: "No", resultId: "other-citizen" },
      ],
    },
  },
  results: {
    "under-18": {
      id: "under-18",
      title: "Not yet eligible",
      summary:
        "You must be 18 or over to vote in Irish elections and referendums.",
      elections: ["Not eligible yet"],
      sources: [officialResourceLinks[4], officialResourceLinks[2]],
    },
    "irish-citizen": {
      id: "irish-citizen",
      title: "Irish citizen",
      summary:
        "Irish citizens can vote in general, local, European, presidential elections, and referendums, subject to registration.",
      elections: [
        "General elections",
        "Local elections",
        "European elections",
        "Presidential elections",
        "Referendums",
      ],
      sources: [officialResourceLinks[4], officialResourceLinks[2]],
    },
    "british-citizen": {
      id: "british-citizen",
      title: "British citizen",
      summary:
        "British citizens can vote in general and local elections in Ireland, subject to registration.",
      elections: ["General elections", "Local elections"],
      sources: [officialResourceLinks[4], officialResourceLinks[2]],
    },
    "eu-citizen": {
      id: "eu-citizen",
      title: "EU citizen",
      summary:
        "EU citizens other than Irish citizens can vote in European and local elections in Ireland, subject to registration.",
      elections: ["European elections", "Local elections"],
      sources: [officialResourceLinks[4], officialResourceLinks[2]],
    },
    "other-citizen": {
      id: "other-citizen",
      title: "Other citizen",
      summary:
        "Citizens of countries outside Ireland, the UK, and the EU can generally vote in local elections only, subject to registration.",
      elections: ["Local elections"],
      sources: [officialResourceLinks[4], officialResourceLinks[2]],
    },
  },
};

export const learningPaths = [
  {
    id: "first-vote",
    title: "First time voting",
    summary:
      "Start with your constituency, then confirm registration, then learn how to rank candidates.",
    steps: [
      "Find your constituency",
      "Check the register",
      "Read the PR-STV guide",
    ],
  },
  {
    id: "understand-pr-stv",
    title: "Understand PR-STV",
    summary:
      "Learn why you rank candidates 1, 2, 3, and how transfers work without wasting your vote.",
    steps: [
      "Rank candidates in order of preference",
      "Do not repeat the same number",
      "Transfers matter if your first preference is elected or eliminated",
    ],
  },
  {
    id: "compare-before-you-vote",
    title: "Compare before you vote",
    summary:
      "Use source-linked issue rows to compare local candidates without relying on one headline or one clip.",
    steps: [
      "Pick two to four local profiles",
      "Review issue rows and sources",
      "Open the original official links before deciding",
    ],
  },
];

export const stvGuide = [
  {
    id: "ranking",
    title: "Rank candidates, do not pick just one",
    body:
      "PR-STV lets you number candidates in order of preference. You can keep ranking for as long as you want.",
  },
  {
    id: "unique-numbers",
    title: "Use each number once",
    body:
      "A valid ballot should not repeat the same preference number for different candidates.",
  },
  {
    id: "transfers",
    title: "Transfers are part of the design",
    body:
      "If your early preference is elected with surplus votes or eliminated, your next valid preference can still matter.",
  },
  {
    id: "no-black-box",
    title: "Politiclear does not tell you who to rank",
    body:
      "Use the compare view, issue summaries, and original sources to make your own decision.",
  },
];

export const newsFeed = [
  {
    id: "official-constituency-lookup",
    title: "Official lookup: confirm your constituency before you compare candidates",
    summary:
      "Use the Electoral Commission tool to verify that you are in the correct constituency before reading any local profile cards.",
    constituencyIds: ["dublin-bay-south", "kerry", "donegal", "galway-west"],
    publishedAt: TODAY,
    sourceLabel: "Electoral Commission",
    sourceType: "Official",
    tags: ["Constituency", "Voting prep"],
    url: "https://www.electoralcommission.ie/what-constituency-am-i-in/",
    whyItMatters:
      "This is the cleanest way to avoid comparing the wrong set of candidates.",
  },
  {
    id: "official-register-check",
    title: "Official guide: check whether you are on the register",
    summary:
      "If you have moved or this is your first vote, start with the official register checker and registration guidance.",
    constituencyIds: ["dublin-bay-south", "kerry", "donegal", "galway-west"],
    publishedAt: TODAY,
    sourceLabel: "Electoral Commission",
    sourceType: "Official",
    tags: ["Registration", "Checklist"],
    url: "https://www.electoralcommission.ie/check-the-register/",
    whyItMatters:
      "Registration is the main blocker that turns political interest into a missed vote.",
  },
  {
    id: "oireachtas-open-data",
    title: "Official data source: Oireachtas open data remains the backbone for representative records",
    summary:
      "Politiclear uses the Oireachtas open data entrypoint as the long-term source for members, contributions, and future vote records.",
    constituencyIds: ["dublin-bay-south", "kerry", "donegal", "galway-west"],
    publishedAt: TODAY,
    sourceLabel: "Houses of the Oireachtas",
    sourceType: "Official",
    tags: ["Transparency", "Public record"],
    url: "https://data.oireachtas.ie/",
    whyItMatters:
      "It gives users a verifiable trail back to parliamentary data instead of opaque AI output.",
  },
  {
    id: "dbs-housing-watch",
    title: "Dublin Bay South watch: housing and transport stay at the center of local comparison",
    summary:
      "For Dublin Bay South, Politiclear highlights housing delivery and day-to-day transport as the strongest recurring local comparison rows.",
    constituencyIds: ["dublin-bay-south"],
    publishedAt: TODAY,
    sourceLabel: "Politiclear brief",
    sourceType: "Curated",
    tags: ["Housing", "Transport"],
    url: "https://www.electoralcommission.ie/who-are-my-tds/",
    whyItMatters:
      "These issues appear repeatedly when deciding between urban representatives in the constituency.",
  },
  {
    id: "kerry-rural-services-watch",
    title: "Kerry watch: rural roads, service access, and coastal resilience remain high-signal issues",
    summary:
      "Kerry profiles in this release are organized around practical regional delivery rather than abstract national branding.",
    constituencyIds: ["kerry"],
    publishedAt: TODAY,
    sourceLabel: "Politiclear brief",
    sourceType: "Curated",
    tags: ["Rural services", "Transport"],
    url: "https://data.cso.ie/",
    whyItMatters:
      "It keeps local comparison focused on the issues voters actually feel day to day.",
  },
  {
    id: "donegal-regional-watch",
    title: "Donegal watch: healthcare, fisheries, and border-region access remain central",
    summary:
      "Donegal comparisons in this release keep regional fairness, healthcare access, and connectivity visible across candidates.",
    constituencyIds: ["donegal"],
    publishedAt: TODAY,
    sourceLabel: "Politiclear brief",
    sourceType: "Curated",
    tags: ["Healthcare", "Regional access"],
    url: "https://www.electoralcommission.ie/who-are-my-tds/",
    whyItMatters:
      "It prevents a one-size-fits-all candidate view from flattening border-region concerns.",
  },
  {
    id: "galway-west-growth-watch",
    title: "Galway West watch: housing, transport, and skills pipeline dominate the civic dashboard",
    summary:
      "Galway West mixes city and regional pressures, so the dashboard keeps housing, transport, and education in the first comparison row.",
    constituencyIds: ["galway-west"],
    publishedAt: TODAY,
    sourceLabel: "Politiclear brief",
    sourceType: "Curated",
    tags: ["Housing", "Education", "Transport"],
    url: "https://data.cso.ie/",
    whyItMatters:
      "A mixed urban-rural constituency needs issue rows that reflect both city growth and regional access.",
  },
];

export function getConstituencyById(constituencyId) {
  return constituencyLookup[constituencyId] || null;
}

export function findConstituencies(query = "") {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return constituencies;
  }

  return constituencies.filter((constituency) => {
    const haystack = [
      constituency.name,
      constituency.summary,
      ...constituency.localIssues,
      ...constituency.searchTerms,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function getCandidatesForConstituency(constituencyId) {
  return candidates.filter((candidate) => candidate.constituencyId === constituencyId);
}

export function getCandidateById(candidateId) {
  return candidateLookup[candidateId] || null;
}

export function getCompareCandidates(candidateIds = []) {
  const selectedCandidates = candidateIds
    .map((candidateId) => getCandidateById(candidateId))
    .filter(Boolean);

  const rows = issueCatalog
    .map((issue) => {
      const cells = selectedCandidates.map((candidate) => {
        const position = candidate.keyIssues.find(
          (candidateIssue) => candidateIssue.issueId === issue.id
        );

        return {
          candidateId: candidate.id,
          evidenceLabel: position?.evidenceLabel || "No verified source yet",
          source: position?.source || null,
          stance: position?.stance || "No verified source yet",
          summary:
            position?.summary ||
            "Politiclear does not have a verified issue summary for this row yet.",
        };
      });

      const hasSignal = cells.some(
        (cell) => cell.stance !== "No verified source yet"
      );

      return hasSignal
        ? {
            issueId: issue.id,
            label: issue.label,
            prompt: issue.prompt,
            cells,
          }
        : null;
    })
    .filter(Boolean);

  return {
    candidates: selectedCandidates,
    rows,
  };
}

export function getNewsFeed(constituencyId) {
  if (!constituencyId) {
    return newsFeed;
  }

  return newsFeed.filter((item) => item.constituencyIds.includes(constituencyId));
}

export function getFeaturedUpdates(constituencyId, limit = 3) {
  return getNewsFeed(constituencyId).slice(0, limit);
}

export function getOfficialResourceLinks() {
  return officialResourceLinks;
}
