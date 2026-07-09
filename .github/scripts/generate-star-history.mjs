#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const ASSET_DIR = path.join(REPO_ROOT, 'assets');
const SVG_PATH = path.join(ASSET_DIR, 'star-history.svg');
const DATA_PATH = path.join(ASSET_DIR, 'star-history.json');

const DEFAULT_REPOSITORY = 'WiseWong6/wise-labs';
const repository = process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
const [owner, repo] = repository.split('/');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const now = process.env.STAR_HISTORY_NOW ? new Date(process.env.STAR_HISTORY_NOW) : new Date();

if (!owner || !repo) {
  throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
}

const apiHeaders = {
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'wise-labs-star-history-generator',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function prettyDate(date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
}

function shortDate(date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function readExistingData() {
  try {
    return JSON.parse(await readFile(DATA_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      ...apiHeaders,
      ...headers,
    },
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }
  if (!response.ok) {
    const message = json?.message || text || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return { json, headers: response.headers };
}

async function fetchRepositoryMeta() {
  const { json } = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`);
  return {
    fullName: json.full_name,
    createdAt: json.created_at,
    stars: Number(json.stargazers_count || 0),
    htmlUrl: json.html_url,
  };
}

function hasNextPage(linkHeader) {
  return Boolean(linkHeader && /rel="next"/.test(linkHeader));
}

async function fetchStargazerEvents() {
  const events = [];
  let page = 1;
  let keepGoing = true;

  while (keepGoing) {
    const { json, headers } = await fetchJson(
      `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`,
      { Accept: 'application/vnd.github.star+json' },
    );

    if (!Array.isArray(json)) {
      throw new Error('Unexpected stargazers API response');
    }

    for (const item of json) {
      if (item?.starred_at) {
        events.push(item.starred_at);
      }
    }

    keepGoing = json.length > 0 && hasNextPage(headers.get('link'));
    page += 1;
  }

  if (events.length === 0) {
    return [];
  }

  return events.sort();
}

function normalizeObservations(existing, latestDate, latestStars) {
  const byDate = new Map();
  for (const item of existing?.observations || []) {
    if (!item?.date || typeof item.stars !== 'number') {
      continue;
    }
    byDate.set(item.date, Math.max(0, item.stars));
  }
  const latestExisting = Array.from(byDate, ([date, stars]) => ({ date, stars }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  if (!latestExisting || latestExisting.stars !== latestStars || latestExisting.date === latestDate) {
    byDate.set(latestDate, Math.max(0, latestStars));
  }
  return Array.from(byDate, ([date, stars]) => ({ date, stars }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function pointsFromStargazers(createdDate, events, latestDate, latestStars) {
  const byDate = new Map([[createdDate, 0]]);
  let count = 0;
  for (const eventDateTime of events) {
    count += 1;
    byDate.set(isoDate(eventDateTime), count);
  }
  if (latestStars > count) {
    byDate.set(latestDate, latestStars);
  }
  return Array.from(byDate, ([date, stars]) => ({ date, stars }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function pointsFromObservations(createdDate, observations) {
  const byDate = new Map([[createdDate, 0]]);
  for (const item of observations) {
    byDate.set(item.date, item.stars);
  }
  return Array.from(byDate, ([date, stars]) => ({ date, stars }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function compactPoints(points) {
  const byDate = new Map();
  for (const item of points) {
    byDate.set(item.date, Math.max(0, Number(item.stars || 0)));
  }
  return Array.from(byDate, ([date, stars]) => ({ date, stars }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function niceMax(value) {
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  if (scaled <= 2) return 2 * magnitude;
  if (scaled <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function toMillis(date) {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function buildPath(points, xScale, yScale) {
  return points
    .map((point, index) => {
      const x = xScale(point.date).toFixed(1);
      const y = yScale(point.stars).toFixed(1);
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');
}

function renderSvg({ meta, points, source, latestDate, latestStars }) {
  const width = 920;
  const height = 420;
  const chart = { x: 74, y: 142, width: 772, height: 210 };
  const axis = { x: chart.x + 56, y: chart.y + 176, width: 660, height: 148 };

  const cleanPoints = compactPoints(points);
  const firstDate = cleanPoints[0]?.date || isoDate(meta.createdAt);
  const lastDate = latestDate;
  const startMs = toMillis(firstDate);
  const endMs = Math.max(toMillis(lastDate), startMs + 86400000);
  const maxStars = niceMax(Math.max(latestStars, ...cleanPoints.map((point) => point.stars)));
  const ticks = [0, maxStars / 2, maxStars];

  const xScale = (date) => axis.x + ((toMillis(date) - startMs) / (endMs - startMs)) * axis.width;
  const yScale = (stars) => axis.y - (stars / maxStars) * axis.height;
  const linePath = buildPath(cleanPoints, xScale, yScale);
  const areaPath = `${linePath} L${xScale(lastDate).toFixed(1)} ${axis.y} L${xScale(firstDate).toFixed(1)} ${axis.y} Z`;

  const latestX = xScale(lastDate);
  const latestY = yScale(latestStars);
  const sourceLabel = source === 'stargazers'
    ? 'Source: GitHub stargazer timestamps'
    : 'Source: GitHub repo count + observed daily snapshots';

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">Wise Labs star history</title>
  <desc id="desc">GitHub star history for ${escapeXml(meta.fullName)}, updated on ${escapeXml(prettyDate(latestDate))}. Current stars: ${latestStars}.</desc>
  <rect width="${width}" height="${height}" rx="16" fill="#0F172A"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="15" stroke="#334155" stroke-width="2"/>
  <circle cx="820" cy="76" r="84" fill="#2563EB" opacity="0.18"/>
  <circle cx="126" cy="332" r="96" fill="#14B8A6" opacity="0.14"/>

  <text x="48" y="64" fill="#F8FAFC" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="30" font-weight="700">Wise Labs Star History</text>
  <text x="48" y="94" fill="#94A3B8" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="15">${escapeXml(meta.fullName)} - updated ${escapeXml(prettyDate(latestDate))}</text>

  <rect x="652" y="44" width="220" height="92" rx="12" fill="#111827" stroke="#334155"/>
  <text x="676" y="78" fill="#94A3B8" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="14" font-weight="600">Current stars</text>
  <text x="676" y="118" fill="#FACC15" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="48" font-weight="800">${latestStars}</text>
  <path d="M820 85L826.4 98L840.8 100.1L830.4 110.2L832.9 124.5L820 117.8L807.1 124.5L809.6 110.2L799.2 100.1L813.6 98L820 85Z" fill="#FACC15"/>

  <g transform="translate(${chart.x} ${chart.y})">
    <rect x="0" y="0" width="${chart.width}" height="${chart.height}" rx="12" fill="#111827" stroke="#334155"/>
    <line x1="56" y1="36" x2="716" y2="36" stroke="#1E293B"/>
    <line x1="56" y1="76" x2="716" y2="76" stroke="#1E293B"/>
    <line x1="56" y1="116" x2="716" y2="116" stroke="#1E293B"/>
    <line x1="56" y1="156" x2="716" y2="156" stroke="#1E293B"/>
    <line x1="56" y1="176" x2="716" y2="176" stroke="#475569"/>
    <line x1="56" y1="28" x2="56" y2="176" stroke="#475569"/>
    <text x="22" y="181" fill="#64748B" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${ticks[0]}</text>
    <text x="14" y="118" fill="#64748B" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${ticks[1]}</text>
    <text x="22" y="42" fill="#64748B" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${ticks[2]}</text>
    <text x="56" y="199" fill="#64748B" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${escapeXml(shortDate(firstDate))}</text>
    <text x="662" y="199" fill="#64748B" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12">${escapeXml(shortDate(lastDate))}</text>
  </g>

  <path d="${areaPath}" fill="url(#area)" opacity="0.5"/>
  <path d="${linePath}" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${latestX.toFixed(1)}" cy="${latestY.toFixed(1)}" r="7" fill="#FACC15" stroke="#0F172A" stroke-width="3"/>
  <text x="${Math.max(92, Math.min(latestX - 110, 760)).toFixed(1)}" y="${Math.max(122, latestY - 14).toFixed(1)}" fill="#F8FAFC" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="13" font-weight="700">${latestStars} stars</text>

  <rect x="74" y="368" width="772" height="28" rx="8" fill="#111827" stroke="#334155"/>
  <text x="92" y="387" fill="#94A3B8" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="13">${escapeXml(sourceLabel)}</text>

  <defs>
    <linearGradient id="area" x1="386" y1="36" x2="386" y2="318" gradientUnits="userSpaceOnUse">
      <stop stop-color="#38BDF8" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#38BDF8" stop-opacity="0"/>
    </linearGradient>
  </defs>
</svg>
`;
}

function comparableData(data) {
  const { generatedAt, ...rest } = data || {};
  return rest;
}

async function main() {
  const existing = await readExistingData();
  const meta = await fetchRepositoryMeta();
  const createdDate = isoDate(meta.createdAt);
  const latestDate = isoDate(now);
  const observations = normalizeObservations(existing, latestDate, meta.stars);

  let source = 'repository-observations';
  let points = pointsFromObservations(createdDate, observations);
  let stargazerError = null;

  try {
    const events = await fetchStargazerEvents();
    if (events.length > 0) {
      points = pointsFromStargazers(createdDate, events, latestDate, meta.stars);
      source = 'stargazers';
    }
  } catch (error) {
    stargazerError = error.message;
  }

  const latestPointDate = points.at(-1)?.date || latestDate;
  const nextData = {
    repo: meta.fullName,
    repoUrl: meta.htmlUrl,
    createdAt: meta.createdAt,
    latest: {
      date: latestPointDate,
      stars: meta.stars,
    },
    source,
    observations,
    points,
  };
  const dataChanged = JSON.stringify(comparableData(existing)) !== JSON.stringify(nextData);
  const data = {
    generatedAt: dataChanged || !existing.generatedAt ? now.toISOString() : existing.generatedAt,
    ...nextData,
  };

  await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
  await writeFile(SVG_PATH, renderSvg({
    meta,
    points,
    source,
    latestDate: latestPointDate,
    latestStars: meta.stars,
  }));

  console.log(`Generated ${path.relative(REPO_ROOT, SVG_PATH)} from ${source}.`);
  if (stargazerError) {
    console.log(`Stargazer timestamp fallback reason: ${stargazerError}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
