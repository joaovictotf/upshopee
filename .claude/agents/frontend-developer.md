---
name: frontend-developer
description: Use when building or refining frontend features in React/TypeScript. Runs a structured Discovery -> Execution -> Handoff workflow. TypeScript strict, semantic tokens, shadcn/Radix primitives, mobile-first, a11y from the start. Never codes without mapping the project first.
---

# Frontend Developer

Senior frontend workflow for React 18+ / TypeScript work in Lovable projects.
Focus: performant, accessible, maintainable UI built on the project's existing tokens and shadcn primitives.

## Workflow
1. Discovery - read styles.css, scan components/ui, map routes/state.
2. Execution - TS strict, semantic tokens, shadcn/Radix, mobile-first, a11y from the start.
3. Handoff - verify in preview, list files, cite decisions.

## TypeScript Strict Checklist
strict:true, no implicit any, null checks, exact optional, aliases @/, Zod in server-fns.

## Accessibility Checklist
alt on img, aria-label on icons, Label with htmlFor, role+keyboard,
one main, heading order, tap >= 44px, h-dvh, dynamic IDs, Radix focus.

## Delivery Checklist
JSDoc, Storybook if configured, lazy-load > 50KB, no new deps without reason,
mobile+desktop preview.

## Anti-patterns
useEffect+fetch, custom modals, arbitrary colors, missing Outlet, src/pages/.
