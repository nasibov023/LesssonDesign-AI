'use strict';
// Run from the LessonDesign AI repository root: node scripts/install-ontario-ppl1o.js
// Registers the Grade 9 PPL1O shard without modifying any existing curriculum shards.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'data/curriculum-manifest.json');
const shardRelativePath = 'data/curriculum-shards/ca-on-en-core-health-physical-education-ppl1o.json';
const shardPath = path.join(root, shardRelativePath);
const shardId = 'ca-on-en-core-health-physical-education-ppl1o';
const expectedCodes = ['AA1','A1','A2','A3','B1','B2','C1','C2','C3'];
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function check(test, message) { if (!test) throw new Error(message); }
try {
  const manifest = read(manifestPath);
  const shard = read(shardPath);
  check(Array.isArray(manifest.shards), 'Expected manifest.shards array');
  check(shard.metadata && shard.metadata.id === shardId, 'Unexpected shard ID');
  check(shard.defaults && shard.defaults.courseCode === 'PPL1O' && shard.defaults.gradeLevel === '9', 'Invalid PPL1O defaults');
  check(Array.isArray(shard.standards) && JSON.stringify(shard.standards.map(s => s.standardCode)) === JSON.stringify(expectedCodes), 'Expected the nine official PPL1O overall expectation codes');
  for (const s of shard.standards) {
    check(s.officialOutcomeText && s.officialOutcomeText.trim(), `Missing text for ${s.standardCode}`);
    check(shard.documents[s.sourceDocumentId] && shard.documents[s.sourceDocumentId].sourceUrl.startsWith('https://'), `Missing source for ${s.standardCode}`);
  }
  const existing = manifest.shards.find(s => s.id === shardId);
  if (existing) {
    check(existing.path === shardRelativePath && existing.standardCount === 9, 'Existing manifest registration conflicts with PPL1O');
    console.log('Already installed: PPL1O (9 overall expectations).');
    process.exit(0);
  }
  const template = manifest.shards.find(s => s.id === 'ca-on-en-core-health-physical-education-g8');
  check(template && template.filters, 'Missing Grade 8 HPE manifest template');
  const entry = JSON.parse(JSON.stringify(template));
  entry.id = shardId;
  entry.label = 'Ontario Healthy Active Living Education Grade 9 PPL1O curriculum pieces';
  entry.path = shardRelativePath;
  entry.standardCount = 9;
  entry.aliasCount = 0;
  entry.filters.gradeLevels = ['9'];
  check(entry.filters.subjectIds && entry.filters.subjectIds.includes('health-physical-education'), 'HPE subject filter missing');
  check(!manifest.shards.some(s => s.path === shardRelativePath), 'Shard path already registered under another ID');
  manifest.shards.push(entry);
  fs.copyFileSync(manifestPath, manifestPath + '.ppl1o-backup');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('PASS: Registered PPL1O with 9 overall expectations.');
  console.log('Backup: data/curriculum-manifest.json.ppl1o-backup');
  console.log('Next: node scripts/ontario-curriculum-import.js');
} catch(error) { console.error('ERROR:', error.message); process.exitCode = 1; }
