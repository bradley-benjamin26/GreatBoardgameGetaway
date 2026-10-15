<!--
Sync Impact Report
- Version change: (unfilled template) → 1.0.0
- Modified principles: none (initial adoption)
- Added sections: Core Principles I–V, Technology & Platform Constraints,
  Development Workflow & Quality Gates, Governance
- Removed sections: none
- Deferred items: none. Ratification date set to the adoption date (2026-10-15).
-->
# Great Boardgame Getaway Constitution

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
Tests MUST be written before the implementation they cover, and MUST be seen to fail before
the implementation is written. Every user-facing behavior in a spec MUST have at least one
automated test that maps to its acceptance scenarios. Red-Green-Refactor is the required cycle.
Rationale: tests written first prove the requirement is testable and prevent regressions.

### II. Simplicity (YAGNI)
Each change MUST implement the smallest solution that satisfies the spec. Speculative
features, abstractions, options, and new dependencies MUST NOT be added. Any added
complexity (extra project, layer, or dependency) MUST be justified in the plan's
complexity-tracking section. Prefer platform features and existing code over new code.
Rationale: a small, readable codebase is cheaper to change and easier to keep correct.

### III. Accessibility
The web app MUST conform to WCAG 2.2 Level AA. All interactive features MUST be operable by
keyboard and usable with a screen reader, use semantic HTML, provide text alternatives for
non-text content, and meet AA color-contrast ratios. Accessibility checks MUST be part of
the acceptance criteria for any UI change.
Rationale: a game-night tool is for everyone who sits at the table.

### IV. Privacy & Security
The app MUST collect only the personal data a feature strictly needs, and MUST NOT share it
with third parties without explicit user consent. All traffic MUST use HTTPS. Secrets MUST
NOT be committed to source control. All external input MUST be validated and output
encoded at trust boundaries. Dependencies with known high-severity vulnerabilities MUST be
resolved before release.
Rationale: users trust the app with names, plans, and schedules; that trust is not optional.

### V. Mobile-First Usability
Every screen MUST be designed for a phone-sized viewport first and then enhanced for larger
screens. The UI MUST work without horizontal scrolling at 320 CSS px width, use touch
targets of at least 44×44 CSS px, and have no hover-only interactions. Core flows MUST be
completable one-handed on a phone and load acceptably on a mobile network.
Rationale: players will mostly use the app on their phones while gathered together.

## Technology & Platform Constraints

- The product is a web application; it MUST run in current evergreen mobile and desktop
  browsers without requiring a native install.
- The specific framework and stack are chosen in each feature plan and MUST satisfy
  Principle II. The plan MUST record the chosen stack and the reason for it.
- Features MUST degrade gracefully on slow or intermittent connections.

## Development Workflow & Quality Gates

- Every feature MUST proceed spec → plan → tasks → implementation, using Spec Kit.
- A change MAY be merged only when all tests pass, accessibility checks pass, and the UI has
  been verified at phone width.
- Every plan MUST include a Constitution Check against Principles I–V; violations MUST be
  documented and justified, or the design MUST be changed.
- Reviews MUST verify compliance with this constitution.

## Governance

This constitution supersedes other practices. Amendments MUST be made through a documented
change to this file that states the rationale and, where existing work is affected, a
migration plan. Versioning follows semantic versioning: MAJOR for removing or redefining a
principle in a backward-incompatible way, MINOR for adding a principle or materially
expanding guidance, PATCH for clarifications and wording. Compliance MUST be reviewed in
each plan's Constitution Check and in code review. Unresolved conflicts with a principle MUST
be escalated to the project owner.

**Version**: 1.0.0 | **Ratified**: 2026-10-15 | **Last Amended**: 2026-10-15
