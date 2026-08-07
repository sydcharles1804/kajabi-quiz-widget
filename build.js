// ═══════════════════════════════════════════════════════════════
//  Netlify build step.
//
//  Assembles dist/ from the tracked source files and generates
//  config.js from environment variables, so credentials live in
//  Netlify's encrypted env settings and never enter git.
//
//  Set these in Netlify: Site configuration → Environment variables
//      SUPABASE_URL
//      SUPABASE_KEY   (the publishable sb_publishable_… key)
//
//  Only the files the widget actually needs are copied, so project
//  docs and internal notes are not served publicly.
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const OUT = 'dist';
const FILES = ['index.html', 'quiz-widget.html'];
const DIRS  = ['fonts'];

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '\nBuild failed: SUPABASE_URL and SUPABASE_KEY must be set.\n' +
    'Add them under Site configuration → Environment variables in Netlify.\n' +
    'Failing the build deliberately — deploying without them would publish\n' +
    'a quiz that silently saves nothing.\n'
  );
  process.exit(1);
}

if (!/^sb_publishable_/.test(SUPABASE_KEY)) {
  console.error(
    '\nBuild failed: SUPABASE_KEY does not look like a publishable key.\n' +
    'It must start with "sb_publishable_". Never use the service role key\n' +
    'here — it bypasses RLS and would expose every submission.\n'
  );
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of FILES) {
  fs.copyFileSync(f, path.join(OUT, f));
  console.log('copied', f);
}

for (const d of DIRS) {
  fs.cpSync(d, path.join(OUT, d), { recursive: true });
  console.log('copied', d + '/');
}

fs.writeFileSync(
  path.join(OUT, 'config.js'),
  '// Generated at build time from Netlify environment variables.\n' +
  'window.QUIZ_CONFIG = {\n' +
  `  SUPABASE_URL: ${JSON.stringify(SUPABASE_URL)},\n` +
  `  SUPABASE_KEY: ${JSON.stringify(SUPABASE_KEY)}\n` +
  '};\n'
);
console.log('generated config.js from environment');

console.log(`\nbuild complete → ${OUT}/`);
