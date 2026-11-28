// Run from the LessonDesign AI repository root: node scripts/install-ontario-snc1w.js
'use strict';
const fs = require('fs');
const path = require('path');
const id = 'ca-on-en-core-science-snc1w';
const shardPath = `data/curriculum-shards/${id}.json`;
const manifestPath = path.resolve('data/curriculum-manifest.json');
const sourcesPath = path.resolve('data/curriculum-sources.json');
const expectedCodes = ['A1','A2','B1','B2','C1','C2','D1','D2','E1','E2'];
function assert(condition, message) { if (!condition) throw new Error(message); }
function load(file) { return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')); }
// Append one entry without reformatting existing manifest entries.
function appendToArray(raw, property, entry) {
  const match = new RegExp('"' + property + '"\\s*:\\s*\\[').exec(raw);
  assert(match, `Missing ${property} array`);
  const start = match.index + match[0].length;
  let depth = 1, quoted = false, escaped = false, end = -1;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) { end = i; break; }
  }
  assert(end >= 0, `Could not locate closing ${property} bracket`);
  const lf = raw.includes('\r\n') ? '\r\n' : '\n';
  const old = raw.slice(start,end);
  const indent = (raw.slice(0,match.index).split(/\r?\n/).pop().match(/^\s*/) || [''])[0];
  const innerIndent = indent + '  ';
  const serialized = JSON.stringify(entry,null,2).replace(/\n/g,lf+innerIndent);
  const trim = old.replace(/\s*$/,'');
  const added = trim + (trim.trim() ? ',' : '') + lf + innerIndent + serialized + lf + indent;
  return raw.slice(0,start)+added+raw.slice(end);
}
try {
  const shard = load(shardPath);
  assert(shard.metadata?.id === id, 'Unexpected SNC1W shard ID');
  assert(shard.defaults?.courseCode === 'SNC1W' && shard.defaults?.gradeLevel === '9', 'Course metadata mismatch');
  assert(shard.standards?.length === 10, 'Expected 10 overall expectations');
  assert(JSON.stringify(shard.standards.map(x=>x.standardCode)) === JSON.stringify(expectedCodes), 'Codes missing or out of order');
  assert(shard.standards.every(x=>x.officialOutcomeText?.trim() && shard.documents?.[x.sourceDocumentId]?.sourceUrl?.startsWith('https://')), 'Missing wording or source');
  const sources = load(sourcesPath);
  assert(sources.curriculumTracks?.some(x=>x.id==='ca-on-en-core-science'), 'Existing Ontario Science track missing');
  const manifest = load(manifestPath);
  assert(Array.isArray(manifest.shards), 'Manifest shards array missing');
  if (manifest.shards.some(x=>x.id===id)) {
    const existing = manifest.shards.find(x=>x.id===id);
    assert(existing.standardCount===10 && existing.path===shardPath, 'Existing SNC1W registration differs; inspect manually');
    console.log('Already installed: SNC1W with 10 overall expectations.');
    process.exit(0);
  }
  const template = manifest.shards.find(x=>x.id==='ca-on-en-core-mathematics-mth1w');
  assert(template, 'MTH1W manifest entry not found: install Grade 9 Mathematics first');
  const entry = JSON.parse(JSON.stringify(template));
  entry.id=id;
  entry.label='Ontario Science Grade 9 SNC1W curriculum pieces';
  entry.path=shardPath;
  entry.filters.country='CA';
  entry.filters.jurisdictionIds=['ca-on'];
  entry.filters.frameworkIds=['ca-on-curriculum'];
  entry.filters.programIds=['en-core'];
  entry.filters.subjectIds=['science'];
  entry.filters.gradeLevels=['9'];
  entry.standardCount=10;
  entry.aliasCount=0;
  const original = fs.readFileSync(manifestPath,'utf8');
  const revised = appendToArray(original,'shards',entry);
  assert(JSON.parse(revised).shards.some(x=>x.id===id&&x.standardCount===10), 'Post-update validation failed');
  fs.copyFileSync(manifestPath,manifestPath+'.snc1w-backup');
  fs.writeFileSync(manifestPath,revised,'utf8');
  console.log('PASS: Registered SNC1W with 10 overall expectations.');
  console.log('Backup: data/curriculum-manifest.json.snc1w-backup');
  console.log('Next: node scripts/ontario-curriculum-import.js');
} catch(e) { console.error('ERROR:',e.message); process.exitCode=1; }
