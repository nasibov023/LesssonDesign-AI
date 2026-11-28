// Run from the LessonDesign AI repository root: node scripts/install-ontario-mth1w.js
'use strict';
const fs = require('fs');
const path = require('path');
const id = 'ca-on-en-core-mathematics-mth1w';
const manifestFile = path.resolve('data/curriculum-manifest.json');
const shardPath = `data/curriculum-shards/${id}.json`;
function fail(msg) { throw new Error(msg); }
try {
  const shard = JSON.parse(fs.readFileSync(shardPath, 'utf8'));
  if (shard.metadata?.id !== id || shard.standards?.length !== 14) fail('MTH1W shard missing/incorrect count');
  const codes = shard.standards.map(s => s.standardCode);
  const expected = ['AA1','A1','A2','B1','B2','B3','C1','C2','C3','C4','D1','D2','E1','F1'];
  if (JSON.stringify(codes) !== JSON.stringify(expected)) fail('Unexpected MTH1W expectation codes');
  const raw = fs.readFileSync(manifestFile, 'utf8');
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest.shards)) fail('Manifest lacks shards');
  if (manifest.shards.some(e => e.id === id)) { console.log('MTH1W already registered; no changes.'); process.exit(0); }
  const template = manifest.shards.find(e => e.id === 'ca-on-en-core-mathematics-g1');
  if (!template) fail('Grade 1 Mathematics template not found');
  const entry = JSON.parse(JSON.stringify(template));
  entry.id = id;
  entry.path = shardPath;
  entry.label = 'Ontario Mathematics Grade 9 MTH1W curriculum pieces';
  entry.filters.gradeLevels = ['9'];
  entry.standardCount = 14;
  entry.aliasCount = 0;
  // Ensure we do not unintentionally reuse Grade 1 metadata in this manifest entry.
  for (const key of Object.keys(entry)) if (/^course(Code|Title|Label)$/.test(key)) delete entry[key];
  // Replace just the closing bracket of the shards array so existing JSON formatting remains unchanged.
  const keyMatch = /"shards"\s*:\s*\[/.exec(raw);
  if (!keyMatch) fail('Could not find shards array in original manifest text');
  let start = keyMatch.index + keyMatch[0].length;
  let depth = 1, inString = false, escaped = false, end = -1;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') inString = false; }
    else if (ch === '"') inString = true;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) { end = i; break; }
  }
  if (end < 0) fail('Could not parse shards array bounds');
  const entriesBefore = raw.slice(start,end);
  if (!entriesBefore.trim()) fail('Unexpected empty shards array');
  const lf = raw.includes('\r\n') ? '\r\n' : '\n';
  const arrayIndent = (raw.slice(0,end).match(/(?:^|\n)([ \t]*)\][^\n]*$/) || [,''])[1];
  const baseIndent = (raw.slice(0,keyMatch.index).match(/(?:^|\n)([ \t]*)[^\n]*$/) || [,''])[1];
  const indent = baseIndent + '  ';
  const serialized = JSON.stringify(entry,null,2).split('\n').map((line,i)=>i?indent+line:line).join(lf);
  const insert = ',' + lf + indent + serialized + lf + baseIndent;
  const edited = raw.slice(0,end).replace(/\s*$/, '') + insert + raw.slice(end);
  const parsed = JSON.parse(edited);
  if (parsed.shards.length !== manifest.shards.length+1) fail('Manifest update count failed');
  fs.copyFileSync(manifestFile,manifestFile+'.mth1w-backup');
  fs.writeFileSync(manifestFile,edited,'utf8');
  console.log('PASS: Registered MTH1W with 14 overall expectations.');
  console.log('Backup: data/curriculum-manifest.json.mth1w-backup');
  console.log('Next: node scripts/ontario-curriculum-import.js');
} catch (e) { console.error('ERROR:', e.message); process.exitCode=1; }
