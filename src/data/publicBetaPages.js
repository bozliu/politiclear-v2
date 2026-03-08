import { projectIssuesNewUrl } from "../config/projectLinks";

export const PUBLIC_BETA_PAGE_IDS = {
  corrections: "corrections",
  dataSources: "data-sources",
  editorialStandards: "editorial-standards",
  limitations: "limitations",
  methodology: "methodology",
  privacyContact: "privacy-contact",
  reportProblem: "report-problem",
  sourcePolicy: "source-policy",
};

export const publicBetaPages = {
  [PUBLIC_BETA_PAGE_IDS.methodology]: {
    id: PUBLIC_BETA_PAGE_IDS.methodology,
    title: "Methodology",
    subtitle:
      "Politiclear is an evidence-first civic explainer. It summarizes public records, but it is not an official election service and it does not make voting recommendations.",
    sections: [
      {
        title: "How Politiclear builds profiles",
        body:
          "Constituency, representative, and ballot coverage begins with bundled public-data snapshots. Candidate detail pages prefer official parliamentary and electoral records, then preserve visible unknowns when Politiclear cannot verify an issue row.",
      },
      {
        title: "How to read an issue row",
        body:
          "An issue row should be treated as a quick briefing, not the whole record. Use the attached source chip to open the original document before relying on a summary in a voting decision.",
      },
      {
        title: "What Politiclear will not do",
        body:
          "Politiclear does not rank candidates for you, does not claim exact address-level constituency accuracy when it only has routing-key or locality evidence, and does not turn missing records into synthetic certainty.",
      },
    ],
  },
  [PUBLIC_BETA_PAGE_IDS.dataSources]: {
    id: PUBLIC_BETA_PAGE_IDS.dataSources,
    title: "Data Sources",
    subtitle:
      "Politiclear should always show which records are official, which are Politiclear summaries, and when a source was last refreshed.",
    sections: [
      {
        title: "Core public record layers",
        body:
          "Politiclear centers Houses of the Oireachtas records, Electoral Commission guidance, constituency lookup tools, and constituency boundary data. These are the primary layers for profiles, voting guidance, and map context.",
      },
      {
        title: "Bundled snapshot model",
        body:
          "Politiclear ships with a generated civic snapshot so the app can still load if the live API is slow or unavailable. The snapshot date is shown in the release banner on every page.",
      },
      {
        title: "Source labeling policy",
        body:
          "Every renderable feed item must include a source label, source type, publication date, last-updated date, and a plain-language explanation of why it matters. Curated items must also include an editorial provenance note.",
      },
    ],
  },
  [PUBLIC_BETA_PAGE_IDS.sourcePolicy]: {
    id: PUBLIC_BETA_PAGE_IDS.sourcePolicy,
    title: "Source Policy",
    subtitle:
      "Politiclear distinguishes official records, party sources, media coverage, fact-checking, and project-authored summaries instead of flattening them into one trust bucket.",
    sections: [
      {
        title: "What can render in the feed",
        body:
          "Official items must include source label, source type, publication date, last-updated date, and why-it-matters context. Non-official items must also include provenance, editorial note, and review state or they are suppressed.",
      },
      {
        title: "How source types differ",
        body:
          "Official and Oireachtas records are treated as primary civic records. Party sources are useful but not neutral. Media and fact-check links are secondary layers. Politiclear summaries must never masquerade as any of those source types.",
      },
      {
        title: "When Politiclear holds back",
        body:
          "If provenance is weak, review metadata is missing, or a source trail cannot be shown clearly, Politiclear should omit the item rather than render an authoritative-looking card.",
      },
    ],
  },
  [PUBLIC_BETA_PAGE_IDS.limitations]: {
    id: PUBLIC_BETA_PAGE_IDS.limitations,
    title: "Limitations",
    subtitle:
      "This release is intentionally conservative. It is a live civic-information service with clear scope limits, not a substitute for official election administration.",
    sections: [
      {
        title: "Constituency lookup precision",
        body:
          "Politiclear currently supports exact constituency-name matches, locality best matches, and Eircode routing-key matches. Routing-key and locality matches should not be read as full address-level certainty.",
      },
      {
        title: "Coverage gaps",
        body:
          "Many candidate rows still depend on official profile records or party-linked sources rather than rich issue-level evidence. When this happens, Politiclear keeps the unknowns visible instead of inventing a stance.",
      },
      {
        title: "Operational limits",
        body:
          "If live API detail refresh fails, Politiclear falls back to the bundled civic snapshot. If an external source link fails to open, Politiclear records that as an operational warning so users can report it.",
      },
    ],
  },
  [PUBLIC_BETA_PAGE_IDS.editorialStandards]: {
    id: PUBLIC_BETA_PAGE_IDS.editorialStandards,
    title: "Editorial Standards",
    subtitle:
      "Politiclear is designed to explain a civic record, not to tell people how to vote.",
    sections: [
      {
        title: "Evidence first",
        body:
          "Every summary should point back to the underlying source trail. Missing evidence stays visible. Opinionated phrasing should not be used to hide uncertainty or simulate confidence.",
      },
      {
        title: "No recommendation engine",
        body:
          "Politiclear does not rank candidates, does not generate a recommended ballot, and does not frame issue summaries as a substitute for reading the original source.",
      },
      {
        title: "Correction over spin",
        body:
          "When data is incomplete, stale, or contested, Politiclear should say so plainly and route users to the underlying official or source-labeled record.",
      },
    ],
  },
  [PUBLIC_BETA_PAGE_IDS.privacyContact]: {
    id: PUBLIC_BETA_PAGE_IDS.privacyContact,
    title: "Privacy & Contact",
    subtitle:
      "Politiclear is designed to avoid handling sensitive voter-register data directly.",
    sections: [
      {
        title: "Privacy posture",
        body:
          "Politiclear does not import or mirror the electoral register. Constituency lookup is limited to constituency names, locality hints, and routing-key level Eircode matching inside the product flow.",
      },
      {
        title: "What the app stores",
        body:
          "The app keeps lightweight local UI state such as your selected constituency and compare set during a session. Users should still rely on official services for registration, polling, and legal election guidance.",
      },
      {
        title: "How to get in touch",
        body:
          "For urgent voting or eligibility questions, use the linked Electoral Commission tools. For product support and issue reports, use the report-an-issue page and include the page, constituency, and source link involved.",
      },
    ],
  },
  [PUBLIC_BETA_PAGE_IDS.corrections]: {
    id: PUBLIC_BETA_PAGE_IDS.corrections,
    title: "Corrections",
    subtitle:
      "A civic product needs a visible correction path, not just a bug tracker hidden in the footer.",
    sections: [
      {
        title: "What qualifies for correction",
        body:
          "Wrong constituency mapping, stale office or committee records, incorrect source labels, broken official links, and misleading summary text all qualify for correction review.",
      },
      {
        title: "How corrections should appear",
        body:
          "Corrections should preserve the original source trail, identify what changed, and update the last-reviewed date so users can see whether a page has been amended.",
      },
      {
        title: "What to send",
        body:
          "Include the page, candidate or constituency, the source URL, and a short note describing what looks wrong. Screenshots help when the issue is visual or accessibility-related.",
      },
    ],
  },
  [PUBLIC_BETA_PAGE_IDS.reportProblem]: {
    id: PUBLIC_BETA_PAGE_IDS.reportProblem,
    title: "Report an Issue",
    subtitle:
      "Public issue reports are most useful when they are concrete, reproducible, and tied to a specific constituency, profile, or source link.",
    sections: [
      {
        title: "What to include",
        body:
          "Capture the page you were on, the constituency or candidate involved, the exact source link that failed or looked misleading, and whether the app was showing a bundled snapshot or live API state.",
      },
      {
        title: "High-priority public issues",
        body:
          "Please report broken external links, misleading constituency lookup precision, wrong or stale source labels, missing candidate evidence sections, and any screen-reader or keyboard navigation blockers.",
      },
      {
        title: "Where to report it",
        body:
          "Use the public GitHub issues page for this deployment. Include screenshots when possible, especially for mobile layout regressions or accessibility issues.",
      },
    ],
    externalLinks: [
      {
        label: "Public GitHub issues",
        note: "Use this for reproducible public issues and source-trail problems.",
        sourceType: "project",
        url: projectIssuesNewUrl,
      },
    ],
  },
};

export function getPublicBetaPage(pageId) {
  return publicBetaPages[pageId] || publicBetaPages[PUBLIC_BETA_PAGE_IDS.methodology];
}
