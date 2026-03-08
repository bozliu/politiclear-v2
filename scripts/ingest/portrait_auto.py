#!/usr/bin/env python3

import json
import re
import subprocess
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urljoin, urlparse

import requests
from lxml import html
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CACHE_PATH = ROOT / "data" / "generated" / "politiclear-portrait-cache.json"
THEJOURNAL_CACHE_PATH = ROOT / "data" / "generated" / "thejournal-ge24-candidates.json"

USER_AGENT = "PoliticlearPortraitResolver/2.0 (+https://skill-deploy-017ji4k0pl.vercel.app)"
DUCKDUCKGO_HTML_SEARCH_URL = "https://html.duckduckgo.com/html/"
JINA_FETCH_PREFIX = "https://r.jina.ai/http://"
THEJOURNAL_GE24_URL = "https://www.thejournal.ie/section/ge24/"
REQUEST_TIMEOUT = (6, 10)
MAX_SEARCH_RESULTS = 5
MAX_QUERY_VARIANTS = 2
MAX_PAGE_FETCHES = 4
MAX_WORKERS = 12
MIN_ACCEPTABLE_THEJOURNAL_CANDIDATES = 600
SOCIAL_DOMAINS = (
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "youtube.com",
)
MEDIA_ALLOWLIST = (
    "businesspost.ie",
    "dublinpeople.com",
    "independent.ie",
    "irishexaminer.com",
    "irishtimes.com",
    "joe.ie",
    "kclr96fm.com",
    "kilkennypeople.ie",
    "kilkennyobserver.ie",
    "limerickleader.ie",
    "newstalk.com",
    "rte.ie",
    "thejournal.ie",
    "watchers.ie",
)
OFFICIAL_DOMAIN_HINTS = (
    ".gov.ie",
    ".oireachtas.ie",
    "citycouncil.ie",
    "city.ie",
    "coco.ie",
    "countycouncil.ie",
    "gov.ie",
    "oireachtas.ie",
)
BLOCKED_IMAGE_PATTERNS = (
    "avatar-default",
    "dummy-social",
    "favicon",
    "gravatar",
    "icon-bar",
    "icon-",
    "logo",
    "placeholder",
    "pixel",
    "site-logo",
)
IMAGE_ATTRS = (
    "src",
    "data-src",
    "data-image",
    "data-lazy-src",
    "data-original",
)
IMAGESET_ATTRS = ("srcset", "data-srcset", "data-lazy-srcset")
THEJOURNAL_CONSTITUENCY_PATTERN = re.compile(
    r"\[([^\]]+?)\]\((https://www\.thejournal\.ie/section/ge24/constituency/(\d+))\)"
)
THEJOURNAL_CANDIDATE_PATTERN = re.compile(
    r"\[!\[Image\s+\d+\]\((https://[^)]+)\)\s*([^\]]+?)\]\((https://www\.thejournal\.ie/section/ge24/candidate/[^)]+)\)"
)
THEJOURNAL_REGISTRY = None
THEJOURNAL_LOOKUP = None
NICKNAME_ALIASES = {
    "gerard": ("gerry",),
    "joseph": ("joe",),
    "patrick": ("paddy", "pat"),
}


def normalize_text(value):
    normalized = unicodedata.normalize("NFD", str(value or ""))
    normalized = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return normalized.strip()


def slugify_text(value):
    return normalize_text(value).replace(" ", "-")


def candidate_registry_key(name, constituency_name):
    return f"{slugify_text(name)}::{slugify_text(constituency_name)}"


def compact_registry_key(value):
    normalized = normalize_text(value)
    normalized = re.sub(r"\bmc\s+", "mc", normalized)
    normalized = re.sub(r"\bmac\s+", "mac", normalized)
    normalized = re.sub(r"\bo\s+", "o", normalized)
    return normalized.replace(" ", "")


def candidate_alias_keys(value):
    raw_value = str(value or "")
    aliases = {compact_registry_key(raw_value)}
    raw_tokens = [token for token in normalize_text(raw_value).split() if token]
    if len(raw_tokens) >= 2:
        aliases.add(compact_registry_key(f"{raw_tokens[0]} {raw_tokens[-1]}"))
        for token in raw_tokens[:-1]:
            aliases.add(compact_registry_key(f"{token} {raw_tokens[-1]}"))
    stripped_quotes = re.sub(r"[\"'“”‘’][^\"'“”‘’]+[\"'“”‘’]", " ", raw_value)
    aliases.add(compact_registry_key(stripped_quotes))

    tokens = [token for token in normalize_text(stripped_quotes).split() if token]
    if len(tokens) >= 2:
        aliases.add(compact_registry_key(f"{tokens[0]} {tokens[-1]}"))
        for token in tokens[:-1]:
            aliases.add(compact_registry_key(f"{token} {tokens[-1]}"))
        for nickname in NICKNAME_ALIASES.get(tokens[0], ()):
            aliases.add(compact_registry_key(" ".join([nickname, *tokens[1:]])))
            aliases.add(compact_registry_key(f"{nickname} {tokens[-1]}"))

    return {alias for alias in aliases if alias}


def hostname_for(url):
    return urlparse(url).netloc.lower().removeprefix("www.")


def candidate_name_tokens(candidate):
    full_name = normalize_text(candidate.get("name", ""))
    return {
        "full": full_name,
        "parts": full_name.split(),
        "slug": slugify_text(candidate.get("name", "")),
        "surname": full_name.split()[-1] if full_name else "",
    }


def unwrap_duckduckgo_url(value):
    if not value:
        return None
    if value.startswith("//"):
        value = f"https:{value}"
    parsed = urlparse(value)
    if "duckduckgo.com" in parsed.netloc and "uddg" in parsed.query:
        return unquote(parse_qs(parsed.query).get("uddg", [""])[0]) or None
    return value


def extract_srcset_url(value):
    if not value:
        return None
    first_entry = value.split(",")[0].strip()
    if not first_entry:
        return None
    return first_entry.split()[0].strip()


def build_requests_session():
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-IE,en;q=0.9",
            "Connection": "close",
            "User-Agent": USER_AGENT,
        }
    )
    return session


def load_resolution_cache(path=DEFAULT_CACHE_PATH):
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload.get("candidates", {}) if isinstance(payload, dict) else {}


def load_cached_thejournal_registry(path=THEJOURNAL_CACHE_PATH):
    if not path.exists():
        return None

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

    candidates = payload.get("candidates", {})
    candidate_count = payload.get("candidateCount") or (
        len(candidates) if isinstance(candidates, dict) else 0
    )
    if not isinstance(candidates, dict) or candidate_count < MIN_ACCEPTABLE_THEJOURNAL_CANDIDATES:
        return None
    sample_entry = next(iter(candidates.values()), None)
    if not sample_entry or not sample_entry.get("constituencyName"):
        return None
    if not sample_entry.get("candidateName") and not sample_entry.get("candidateSlug"):
        return None
    return candidates if candidates else None


def save_thejournal_registry(registry, path=THEJOURNAL_CACHE_PATH):
    if len(registry) < MIN_ACCEPTABLE_THEJOURNAL_CANDIDATES:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"candidateCount": len(registry), "candidates": registry}, indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )


def save_resolution_cache(cache_entries, today, path=DEFAULT_CACHE_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": today,
        "candidates": cache_entries,
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def cache_entry_is_usable(entry, portraits_dir):
    if not entry or entry.get("portraitResolutionState") != "resolved":
        return False
    delivery_mode = entry.get("portraitDeliveryMode")
    if delivery_mode == "proxied":
        return bool(entry.get("portraitSourceUrl"))
    portrait_path = (entry.get("portraitPath") or "").strip()
    if not portrait_path:
        return False
    resolved_path = portraits_dir / Path(portrait_path).name
    return resolved_path.exists() and resolved_path.stat().st_size > 1024


def search_duckduckgo(query, max_results=MAX_SEARCH_RESULTS):
    response_text = None

    try:
        with build_requests_session() as session:
            response = session.get(
                DUCKDUCKGO_HTML_SEARCH_URL,
                params={"q": query},
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            response_text = response.text
    except requests.RequestException:
        result = subprocess.run(
            [
                "curl",
                "-L",
                "--silent",
                "--show-error",
                "--max-time",
                "15",
                "--get",
                "--data-urlencode",
                f"q={query}",
                "--user-agent",
                USER_AGENT,
                "--header",
                "Accept-Language: en-IE,en;q=0.9",
                DUCKDUCKGO_HTML_SEARCH_URL,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            response_text = result.stdout

    if not response_text:
        return []

    document = html.fromstring(response_text)
    results = []
    for index, anchor in enumerate(document.xpath("//a[contains(@class, 'result__a')]")):
        if index >= max_results:
            break
        url = unwrap_duckduckgo_url(anchor.get("href"))
        if not url:
            continue
        title = " ".join(anchor.xpath(".//text()")).strip()
        snippet = " ".join(
            anchor.xpath(
                "./ancestor::div[contains(@class, 'result__body')][1]//*[contains(@class, 'result__snippet')]//text()"
            )
        ).strip()
        results.append(
            {
                "rank": index + 1,
                "searchQuery": query,
                "snippet": snippet,
                "title": title,
                "url": url,
            }
        )
    return results


def fetch_markdown_via_jina(url, retries=3):
    last_error = None
    for attempt in range(retries):
        try:
            with build_requests_session() as session:
                response = session.get(
                    f"{JINA_FETCH_PREFIX}{url}",
                    timeout=(10, 20),
                )
                response.raise_for_status()
                if response.text.strip():
                    return response.text
                last_error = ValueError("empty response body")
        except Exception as error:
            last_error = error
        time.sleep(1 + attempt)
    raise last_error or RuntimeError(f"Failed to fetch markdown for {url}")


def clean_thejournal_constituency_label(label):
    cleaned = re.sub(r"(?:\s+\d+)+$", "", label).strip()
    cleaned = re.sub(r"\s+FF$", "", cleaned).strip()
    return cleaned


def build_thejournal_registry(cache_path=THEJOURNAL_CACHE_PATH):
    cached = load_cached_thejournal_registry(cache_path)
    if cached:
        return cached

    node_result = subprocess.run(
        ["node", str(ROOT / "scripts" / "ingest" / "build_thejournal_registry.mjs")],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        check=False,
    )
    if node_result.returncode == 0:
        cached = load_cached_thejournal_registry(cache_path)
        if cached:
            return cached

    registry = {}
    try:
        section_markdown = fetch_markdown_via_jina(THEJOURNAL_GE24_URL)
    except Exception:
        return registry

    seen_constituencies = set()
    constituency_entries = []
    for label, url, _constituency_id in THEJOURNAL_CONSTITUENCY_PATTERN.findall(section_markdown):
        clean_name = clean_thejournal_constituency_label(label)
        key = slugify_text(clean_name)
        if not clean_name or key in seen_constituencies:
            continue
        seen_constituencies.add(key)
        constituency_entries.append(
            {
                "constituencyName": clean_name,
                "url": url,
            }
        )

    for constituency in constituency_entries:
        try:
            markdown = fetch_markdown_via_jina(constituency["url"])
        except Exception:
            continue

        for image_url, _body_text, candidate_url in THEJOURNAL_CANDIDATE_PATTERN.findall(markdown):
            path_parts = urlparse(candidate_url).path.rstrip("/").split("/")
            if len(path_parts) < 2:
                continue
            slug = unquote(path_parts[-1])
            candidate_id = unquote(path_parts[-2])
            if not candidate_id.isdigit() or not slug:
                continue

            key = candidate_registry_key(slug.replace("-", " "), constituency["constituencyName"])
            registry[key] = {
                "candidateName": slug.replace("-", " "),
                "candidateSlug": slug,
                "constituencyName": constituency["constituencyName"],
                "portraitDeliveryMode": "proxied",
                "portraitPath": None,
                "portraitResolutionState": "resolved",
                "portraitSourceDomain": "thejournal.ie",
                "portraitSourcePageUrl": candidate_url,
                "portraitSourceType": "media",
                "portraitSourceUrl": re.sub(r"width=\d+", "width=600", image_url),
                "sourceImageUrl": re.sub(r"width=\d+", "width=600", image_url),
                "thejournalCandidateId": candidate_id,
            }
        time.sleep(0.25)

    if registry:
        save_thejournal_registry(registry, cache_path)

    return registry


def build_thejournal_lookup(registry):
    lookup = {}
    for key, entry in (registry or {}).items():
        key_name_slug = None
        key_constituency_slug = None
        if "::" in key:
            key_name_slug, key_constituency_slug = key.split("::", 1)
        constituency_name = entry.get("constituencyName")
        candidate_slug = entry.get("candidateSlug") or key_name_slug or ""
        candidate_name = entry.get("candidateName") or candidate_slug.replace("-", " ")
        if not constituency_name:
            constituency_name = (key_constituency_slug or "").replace("-", " ")
        if not constituency_name:
            continue
        lookup.setdefault(compact_registry_key(constituency_name), []).append(
            {
                **entry,
                "candidateName": candidate_name,
                "candidateSlug": candidate_slug,
                "constituencyName": constituency_name,
                "aliasKeys": candidate_alias_keys(
                    candidate_name or candidate_slug or ""
                ),
            }
        )
    return lookup


def find_thejournal_match(candidate, thejournal_lookup):
    if not thejournal_lookup:
        return None

    constituency_entries = thejournal_lookup.get(
        compact_registry_key(candidate.get("constituencyName", "")),
        [],
    )
    if not constituency_entries:
        return None

    aliases = candidate_alias_keys(candidate.get("name", ""))
    candidate_tokens = normalize_text(candidate.get("name", "")).split()
    candidate_surname = candidate_tokens[-1] if candidate_tokens else ""
    best_match = None
    best_score = 0

    for entry in constituency_entries:
        entry_aliases = entry.get("aliasKeys", set())
        if aliases & entry_aliases:
            return entry

        entry_tokens = normalize_text(entry.get("candidateName", "")).split()
        entry_surname = entry_tokens[-1] if entry_tokens else ""
        score = max(
            (
                SequenceMatcher(None, left, right).ratio()
                for left in aliases
                for right in entry_aliases
            ),
            default=0,
        )
        if candidate_surname and entry_surname and candidate_surname != entry_surname:
            surname_similarity = SequenceMatcher(
                None,
                compact_registry_key(candidate_surname),
                compact_registry_key(entry_surname),
            ).ratio()
            if surname_similarity < 0.82 and score < 0.86:
                continue

        if (
            candidate_tokens
            and entry_tokens
            and candidate_tokens[0][0] == entry_tokens[0][0]
        ):
            score += 0.02
        if score > best_score:
            best_score = score
            best_match = entry

    if best_match and best_score >= 0.82:
        return best_match
    return None


def query_variants_for(candidate):
    name = candidate.get("name", "").strip()
    party = candidate.get("party", "").strip()
    constituency = candidate.get("constituencyName", "").strip()
    variants = [
        f'"{name}" "{constituency}" "{party}"',
        f'"{name}" "{party}" Ireland',
        f'"{name}" "{constituency}" candidate',
    ]
    deduped = []
    seen = set()
    for item in variants:
        normalized = normalize_text(item)
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(item)
    return deduped[:MAX_QUERY_VARIANTS]


def build_candidate_result_pool(candidate):
    pooled = []
    seen_urls = set()
    for query in query_variants_for(candidate):
        try:
            results = search_duckduckgo(query)
        except Exception:
            results = []
        for result in results:
            if result["url"] in seen_urls:
                continue
            seen_urls.add(result["url"])
            pooled.append(result)
    return pooled


def page_identity_score(candidate, text_blob):
    if not text_blob:
        return 0
    text = normalize_text(text_blob)
    if not text:
        return 0
    score = 0
    name = candidate_name_tokens(candidate)
    if name["full"] and name["full"] in text:
        score += 60
    if name["surname"] and name["surname"] in text:
        score += 12
    for part in name["parts"][:2]:
        if part and part in text:
            score += 6
    party = normalize_text(candidate.get("party", ""))
    constituency = normalize_text(candidate.get("constituencyName", ""))
    if party and party in text:
        score += 12
    if constituency and constituency in text:
        score += 10
    if "candidate" in text or "councillor" in text or "td" in text:
        score += 4
    return score


def classify_source_type(result_url, party_site_url=None):
    hostname = hostname_for(result_url)
    if party_site_url and hostname_for(party_site_url) in hostname:
        return "party"
    if any(item in hostname for item in SOCIAL_DOMAINS):
        return "social"
    if any(item in hostname for item in MEDIA_ALLOWLIST):
        return "media"
    if any(item in hostname for item in OFFICIAL_DOMAIN_HINTS):
        return "official"
    return "candidate-web"


def result_is_candidate_owned(candidate, result):
    name = candidate_name_tokens(candidate)
    result_text = normalize_text(
        f"{result.get('title', '')} {result.get('snippet', '')} {result.get('url', '')}"
    )
    if name["full"] and name["full"] in result_text:
        return True
    return bool(name["surname"] and name["surname"] in result_text and name["slug"] in normalize_text(result.get("url", "")))


def extract_image_candidates(document, page_url, candidate):
    name = candidate_name_tokens(candidate)
    candidates = {}

    def remember(url, score, label):
        if not url:
            return
        absolute = urljoin(page_url, url.strip())
        lowered = absolute.lower()
        if lowered.startswith("data:") or any(
            token in lowered for token in BLOCKED_IMAGE_PATTERNS
        ):
            return
        if lowered.endswith(".svg"):
            return
        previous = candidates.get(absolute)
        if previous is None or score > previous["score"]:
            candidates[absolute] = {"score": score, "label": label}

    page_path = urlparse(page_url).path
    thejournal_match = re.search(r"/candidate/(\d+)/", page_path)
    if thejournal_match:
        candidate_id = thejournal_match.group(1)
        remember(
            f"https://img2.thejournal.ie/candidate/{candidate_id}/square/?width=600",
            120,
            "thejournal-candidate-endpoint",
        )

    for meta_xpath in (
        "//meta[@property='og:image']/@content",
        "//meta[@property='og:image:url']/@content",
        "//meta[@name='twitter:image']/@content",
        "//meta[@name='twitter:image:src']/@content",
    ):
        for value in document.xpath(meta_xpath):
            remember(value, 46, "meta-image")

    for image in document.xpath("//img")[:120]:
        attr_blob = " ".join(
            [
                image.get("alt", ""),
                image.get("title", ""),
                image.get("aria-label", ""),
                image.get("class", ""),
                image.get("id", ""),
            ]
        )
        attr_text = normalize_text(attr_blob)
        width = int(image.get("width", "0") or "0")
        height = int(image.get("height", "0") or "0")

        for attr in IMAGE_ATTRS:
            remember_score = 0
            source_url = image.get(attr)
            if not source_url:
                continue
            if name["full"] and name["full"] in attr_text:
                remember_score += 34
            if name["surname"] and name["surname"] in attr_text:
                remember_score += 16
            if name["surname"] and name["surname"] in normalize_text(source_url):
                remember_score += 18
            if any(token in attr_text for token in ("candidate", "portrait", "profile", "headshot", "member")):
                remember_score += 10
            if width >= 180 or height >= 180:
                remember_score += 4
            if remember_score > 0:
                remember(source_url, remember_score, f"img:{attr}")

        for attr in IMAGESET_ATTRS:
            source_url = extract_srcset_url(image.get(attr))
            if not source_url:
                continue
            remember_score = 0
            if name["surname"] and name["surname"] in normalize_text(source_url):
                remember_score += 12
            if any(token in attr_text for token in ("candidate", "portrait", "profile", "headshot", "member")):
                remember_score += 8
            if remember_score > 0:
                remember(source_url, remember_score, f"imgset:{attr}")

    return sorted(
        (
            {
                "label": payload["label"],
                "score": payload["score"],
                "url": url,
            }
            for url, payload in candidates.items()
        ),
        key=lambda item: item["score"],
        reverse=True,
    )


def fetch_page_context(url):
    with build_requests_session() as session:
        response = session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        if "text/html" not in response.headers.get("content-type", ""):
            raise ValueError("non-html response")
        document = html.fromstring(response.text)
        final_url = response.url
    title = " ".join(document.xpath("//title/text()")).strip()
    headings = " ".join(document.xpath("//h1//text() | //h2//text()"))[:2000]
    meta_description = " ".join(
        document.xpath("//meta[@name='description']/@content | //meta[@property='og:description']/@content")
    )[:1000]
    page_text = " ".join(
        [
            title,
            headings,
            meta_description,
        ]
    )
    return {
        "document": document,
        "finalUrl": final_url,
        "pageText": page_text,
        "title": title,
    }


def normalize_image(source_bytes, destination):
    image = Image.open(BytesIO(source_bytes)).convert("RGB")
    image = ImageOps.fit(
        image,
        (512, 512),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.35),
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="JPEG", quality=88, optimize=True)


def cache_remote_image(image_url, destination, referer=None):
    headers = {
        "Accept": "image/*",
        "Referer": referer or image_url,
    }
    with build_requests_session() as session:
        response = session.get(image_url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        content = response.content
    normalize_image(content, destination)


def resolve_candidate_portrait(candidate, portraits_dir, party_site_lookup, cache_entries):
    cache_entry = cache_entries.get(candidate["id"])
    if cache_entry_is_usable(cache_entry, portraits_dir):
        return cache_entry

    journal_match = find_thejournal_match(candidate, THEJOURNAL_LOOKUP)
    if journal_match:
        metadata = {
            "portraitDeliveryMode": journal_match.get("portraitDeliveryMode"),
            "portraitPath": journal_match.get("portraitPath"),
            "portraitResolutionState": journal_match.get("portraitResolutionState"),
            "portraitSourceDomain": journal_match.get("portraitSourceDomain"),
            "portraitSourcePageUrl": journal_match.get("portraitSourcePageUrl"),
            "portraitSourceType": journal_match.get("portraitSourceType"),
            "portraitSourceUrl": journal_match.get("portraitSourceUrl"),
            "sourceImageUrl": journal_match.get("sourceImageUrl"),
            "portraitSearchQuery": "thejournal-ge24-registry",
            "portraitSearchRank": 0,
        }
        cache_entries[candidate["id"]] = metadata
        return metadata

    party_site_url = party_site_lookup.get(candidate.get("party"))
    results = build_candidate_result_pool(candidate)
    for result in results[:MAX_PAGE_FETCHES]:
        source_type = classify_source_type(result["url"], party_site_url)
        if source_type == "candidate-web" and not result_is_candidate_owned(candidate, result):
            continue

        try:
            page_context = fetch_page_context(result["url"])
        except Exception:
            continue

        identity_score = page_identity_score(
            candidate,
            " ".join(
                [
                    result.get("title", ""),
                    result.get("snippet", ""),
                    page_context.get("pageText", ""),
                ]
            ),
        )
        minimum_identity_score = 42 if source_type in {"party", "official", "candidate-web"} else 36
        if identity_score < minimum_identity_score:
            continue

        image_candidates = extract_image_candidates(
            page_context["document"],
            page_context["finalUrl"],
            candidate,
        )
        if not image_candidates:
            continue

        best_image = image_candidates[0]
        portrait_relative_path = None
        delivery_mode = "proxied" if source_type == "media" else "cached"

        if delivery_mode == "cached":
            portrait_path = portraits_dir / f"{candidate['id']}.jpg"
            try:
                cache_remote_image(
                    best_image["url"],
                    portrait_path,
                    referer=page_context["finalUrl"],
                )
            except Exception:
                continue
            if not portrait_path.exists() or portrait_path.stat().st_size <= 1024:
                continue
            portrait_relative_path = f"portraits/{candidate['id']}.jpg"

        metadata = {
            "portraitDeliveryMode": delivery_mode,
            "portraitPath": portrait_relative_path,
            "portraitResolutionState": "resolved",
            "portraitSearchQuery": result["searchQuery"],
            "portraitSearchRank": result["rank"],
            "portraitSourceDomain": hostname_for(page_context["finalUrl"]),
            "portraitSourcePageUrl": page_context["finalUrl"],
            "portraitSourceType": source_type,
            "portraitSourceUrl": best_image["url"],
            "sourceImageUrl": best_image["url"],
        }
        cache_entries[candidate["id"]] = metadata
        return metadata

    metadata = {
        "portraitDeliveryMode": None,
        "portraitPath": None,
        "portraitResolutionState": "unresolved",
        "portraitSearchQuery": None,
        "portraitSearchRank": None,
        "portraitSourceDomain": None,
        "portraitSourcePageUrl": None,
        "portraitSourceType": None,
        "portraitSourceUrl": None,
        "sourceImageUrl": None,
    }
    cache_entries[candidate["id"]] = metadata
    return metadata


def resolve_portraits(candidates, portraits_dir, party_site_lookup, today, cache_path=DEFAULT_CACHE_PATH):
    portraits_dir.mkdir(parents=True, exist_ok=True)
    cache_entries = load_resolution_cache(cache_path)
    resolved = {}
    global THEJOURNAL_REGISTRY, THEJOURNAL_LOOKUP
    if THEJOURNAL_REGISTRY is None:
        THEJOURNAL_REGISTRY = build_thejournal_registry()
        THEJOURNAL_LOOKUP = build_thejournal_lookup(THEJOURNAL_REGISTRY)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_map = {
            executor.submit(
                resolve_candidate_portrait,
                candidate,
                portraits_dir,
                party_site_lookup,
                cache_entries,
            ): candidate
            for candidate in candidates
        }
        for future in as_completed(future_map):
            candidate = future_map[future]
            try:
                resolved[candidate["id"]] = future.result()
            except Exception:
                resolved[candidate["id"]] = {
                    "portraitDeliveryMode": None,
                    "portraitPath": None,
                    "portraitResolutionState": "unresolved",
                    "portraitSearchQuery": None,
                    "portraitSearchRank": None,
                    "portraitSourceDomain": None,
                    "portraitSourcePageUrl": None,
                    "portraitSourceType": None,
                    "portraitSourceUrl": None,
                    "sourceImageUrl": None,
                }
                cache_entries[candidate["id"]] = resolved[candidate["id"]]

    save_resolution_cache(cache_entries, today, cache_path)
    return resolved
