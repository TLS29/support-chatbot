/**
 * dependency-cruiser — Clean Architecture guardrails.
 *
 * Enforces the dependency rule: source code may only point INWARD.
 *
 *   interfaces  →  infrastructure  →  application  →  domain
 *   (outer)                                           (inner, pure)
 *
 * Each forbidden rule below blocks one illegal direction. If you break it,
 * `pnpm lint:deps` fails (and so does CI). Run from packages/api.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment:
        "Circular imports make modules impossible to reason about and load in isolation.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-stays-pure",
      comment:
        "domain/ is the core: entities and rules. It must not depend on ANY other layer.",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(application|infrastructure|interfaces)" },
    },
    {
      name: "application-only-domain",
      comment:
        "application/ holds use cases. It may import from domain/ only — never from outer layers.",
      severity: "error",
      from: { path: "^src/application" },
      to: { path: "^src/(infrastructure|interfaces)" },
    },
    {
      name: "infrastructure-not-interfaces",
      comment:
        "infrastructure/ (adapters) may use domain + application, but never the HTTP layer above it.",
      severity: "error",
      from: { path: "^src/infrastructure" },
      to: { path: "^src/interfaces" },
    },
    {
      name: "not-to-unresolvable",
      comment:
        "An import that can't be resolved is a typo or a missing dependency — fail loudly.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    // Don't crawl into installed packages — we only police our own src/.
    doNotFollow: { path: "node_modules" },
    // Resolve TS path/alias settings exactly like the compiler does.
    tsConfig: { fileName: "tsconfig.json" },
    // Follow type-only imports too (import type { ... }) so the rules can't be bypassed.
    tsPreCompilationDeps: true,
    // Teach the resolver about TS extensions so extensionless imports
    // (e.g. "./config/env" → env.ts) resolve — without this the layer
    // rules never match and everything looks "unresolvable".
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
