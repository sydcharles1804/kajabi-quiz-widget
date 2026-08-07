// ═══════════════════════════════════════════════════════════════
//  Runtime config template. Copy this file to config.js and fill in
//  the real values — config.js is gitignored so credentials never
//  reach the repo.
//
//      cp config.example.js config.js
//
//  Find both values in the Supabase dashboard under
//  Project Settings → API. Use the publishable key
//  (sb_publishable_...), not the service role key — the service role
//  key bypasses RLS entirely and must never be sent to a browser.
//
//  Note: whatever key you put here is served to every visitor, so it
//  is public by design. Access is restricted by the RLS policy on
//  quiz_submissions (INSERT only, no SELECT), not by hiding the key.
// ═══════════════════════════════════════════════════════════════
window.QUIZ_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_KEY: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
};
