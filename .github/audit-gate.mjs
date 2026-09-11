// Production dependency audit gate with a documented allowlist.
//
// Usage in CI:  npm audit --omit=dev --json | node .github/audit-gate.mjs
//
// Fails (exit 1) if npm reports any CRITICAL advisory whose GHSA id is not listed in
// .github/audit-allowlist.json. Everything critical-and-unlisted (including any NEW
// advisory, even on `next`) still blocks. Warnings/low/moderate/high never fail here;
// the blocking threshold is CRITICAL by design.
import { readFileSync } from "node:fs";

const ghsaOf = (url) => (String(url).match(/GHSA-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+/i) || [])[0];

let allowlist;
try {
  allowlist = new Set(JSON.parse(readFileSync(".github/audit-allowlist.json", "utf8")).allow || []);
} catch (e) {
  console.error("Could not read .github/audit-allowlist.json:", e.message);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(0, "utf8"));
} catch (e) {
  console.error("Could not parse `npm audit --json` output:", e.message);
  process.exit(2);
}

const offenders = new Set();
const vulns = report.vulnerabilities || {};

const collect = (via) => {
  for (const v of via || []) {
    if (v && typeof v === "object") {
      const id = ghsaOf(v.url || "");
      if (id && !allowlist.has(id)) offenders.add(`${id} (${v.title || "advisory"})`);
      // Advisory may be nested one level under a transitive package reference.
      if (Array.isArray(v.via)) collect(v.via);
    }
  }
};

for (const entry of Object.values(vulns)) {
  if (entry && entry.severity === "critical") collect(entry.via);
}

if (offenders.size > 0) {
  console.error(`\n✖ ${offenders.size} un-allowlisted CRITICAL production advisory(ies):`);
  for (const o of offenders) console.error(`   - ${o}`);
  console.error(`\nIf this is expected and pinned on purpose, add the GHSA to .github/audit-allowlist.json with a reason.`);
  process.exit(1);
}

const allowlistedFound = new Set();
for (const entry of Object.values(vulns)) {
  if (entry && entry.severity === "critical") {
    for (const v of entry.via || []) {
      const id = v && typeof v === "object" ? ghsaOf(v.url || "") : null;
      if (id && allowlist.has(id)) allowlistedFound.add(id);
    }
  }
}

console.log(`✔ Production audit passed (CRITICAL blocking, audit-level).`);
if (allowlistedFound.size) console.log(`   (allowlisted, known-pinned: ${allowlistedFound.size})`);
