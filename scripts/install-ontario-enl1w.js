// Run from the LessonDesign AI repository root: node scripts/install-ontario-enl1w.js
'use strict';
const fs = require('fs');
const path = require('path');
const id = 'ca-on-en-core-english-enl1w';
const shardPath = `data/curriculum-shards/${id}.json`;
const manifestPath = path.resolve('data/curriculum-manifest.json');
const sourcesPath = path.resolve('data/curriculum-sources.json');
const expectedCodes = ['A1','A2','A3','B1','B2','B3','C1','C2','C3','D1','D2','D3'];
function assert(condition, message) { if (!condition) throw new Error(message); }
function load(filename) { return JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')); }
function patchArray(raw, property, newEntry) {
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
  assert(end >= 0, `Could not find end of ${property} array`);
  const lf = raw.includes('\r\n') ? '\r\n' : '\n';
  const existing = raw.slice(start, end);
  const beforeLine = raw.slice(0, match.index).split(/\r?\n/).pop();
  const baseIndent = (beforeLine.match(/^\s*/) || [''])[0];
  const indent = baseIndent + '  ';
  const serialized = JSON.stringify(newEntry, null, 2).replace(/\n/g, lf + indent);
  const trimmed = existing.replace(/\s*$/, '');
  const added = trimmed + (trimmed.trim() ? ',' : '') + lf + indent + serialized + lf + baseIndent;
  return raw.slice(0,start) + added + raw.slice(end);
}
try {
  const shard = load(shardPath);
  assert(shard.metadata?.id === id, 'Unexpected ENL1W shard ID');
  assert(shard.standards?.length === 12, 'Expected exactly 12 ENL1W overall expectations');
  assert(JSON.stringify(shard.standards.map(x => x.standardCode)) === JSON.stringify(expectedCodes), 'Wrong or out-of-order ENL1W codes');
  assert(shard.standards.every(x => x.officialOutcomeText && x.sourceDocumentId), 'Missing expectation wording/source');
  const manifest = load(manifestPath);
  const sources = load(sourcesPath);
  assert(Array.isArray(manifest.shards), 'Manifest shards missing');
  assert(Array.isArray(sources.curriculumTracks), 'Source tracks missing');
  assert(Array.isArray(sources.subjects) && Array.isArray(sources.subjectAreas), 'Source subject registries missing');
  const trackId = 'ca-on-en-core-english';
  const trackExists = sources.curriculumTracks.some(t => t.id === trackId);
  const subjectExists = sources.subjects.some(s => s.id === 'english');
  const areaExists = sources.subjectAreas.some(s => s.id === 'english');
  const shardExists = manifest.shards.some(s => s.id === id);
  if (shardExists && trackExists && subjectExists && areaExists) {
    console.log('ENL1W already installed. No changes made.'); process.exit(0);
  }
  const template = manifest.shards.find(s => s.id === 'ca-on-en-core-mathematics-mth1w');
  assert(template, 'MTH1W manifest entry missing: install MTH1W first');
  const entry = JSON.parse(JSON.stringify(template));
  entry.id = id;
  entry.label = 'Ontario English Grade 9 ENL1W curriculum pieces';
  entry.path = shardPath;
  entry.filters.subjectIds = ['english'];
  entry.filters.gradeLevels = ['9'];
  entry.standardCount = 12;
  entry.aliasCount = 0;
  const track = {
    id: trackId, country:'CA',jurisdictionId:'ca-on',frameworkId:'ca-on-curriculum',programId:'en-core',
    subjectAreaId:'english',subject:'english',label:'Ontario English',
    sourceUrl:'https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-english/courses/enl1w/strands'
  };
  // Modify only the required registries. Preserve their other entries and whitespace.
  let newManifestRaw = fs.readFileSync(manifestPath,'utf8');
  let newSourcesRaw = fs.readFileSync(sourcesPath,'utf8');
  if (!shardExists) newManifestRaw = patchArray(newManifestRaw, 'shards', entry);
  if (!subjectExists) newSourcesRaw = patchArray(newSourcesRaw, 'subjects', {id:'english',label:'English'});
  if (!areaExists) newSourcesRaw = patchArray(newSourcesRaw, 'subjectAreas', {id:'english',label:'English',featuredSubject:'english'});
  if (!trackExists) newSourcesRaw = patchArray(newSourcesRaw, 'curriculumTracks', track);
  const newManifest=JSON.parse(newManifestRaw), newSources=JSON.parse(newSourcesRaw);
  assert(newManifest.shards.some(x=>x.id===id && x.standardCount===12), 'Manifest verification failed');
  assert(newSources.curriculumTracks.some(x=>x.id===trackId), 'Track verification failed');
  // Back up both before committing either update.
  if (newManifestRaw !== fs.readFileSync(manifestPath,'utf8')) fs.copyFileSync(manifestPath, manifestPath+'.enl1w-backup');
  if (newSourcesRaw !== fs.readFileSync(sourcesPath,'utf8')) fs.copyFileSync(sourcesPath, sourcesPath+'.enl1w-backup');
  if (newManifestRaw !== fs.readFileSync(manifestPath,'utf8')) fs.writeFileSync(manifestPath,newManifestRaw,'utf8');
  if (newSourcesRaw !== fs.readFileSync(sourcesPath,'utf8')) fs.writeFileSync(sourcesPath,newSourcesRaw,'utf8');
  console.log('PASS: Registered ENL1W with 12 overall expectations.');
  console.log('Backups: data/curriculum-manifest.json.enl1w-backup (if changed), data/curriculum-sources.json.enl1w-backup (if changed)');
  console.log('Next: node scripts/ontario-curriculum-import.js');
} catch (error) { console.error('ERROR:', error.message); process.exitCode=1; }
