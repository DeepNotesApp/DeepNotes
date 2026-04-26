# DeepNotes — Non-Technical Overview

This document describes what DeepNotes is, who it is for, and how it behaves from a product perspective. It is written for readers who do not need implementation or architecture detail.

---

## What DeepNotes is

**DeepNotes** is an open-source note-taking and thinking tool built around **infinite canvases**: large workspaces where you place many separate notes, move and resize them, and connect ideas with links rather than scrolling through one long document.

The public product lives at [deepnotes.app](https://deepnotes.app). The same ideas power the application whose source code is in this repository.

---

## Why it exists

DeepNotes was created to emphasize **simplicity**, **freedom of layout**, and **privacy**. It is a deliberate reaction to common frustrations with mainstream note apps: feeling trapped in a single “wall of text,” fighting rigid folder trees, wading through cluttered feature sets, and worrying about who can read your notes.

The project positions itself as focused on the essentials: **notes and connections between them**, inside pages you arrange spatially.

---

## How you work inside the product

- **Spatial notes:** You work on a canvas where notes float in space. You can create, move, resize, and style them instead of locking everything into one linear stream.
- **Nesting:** Notes can live inside **containers**, so you can group related material and drill into detail without losing the big picture.
- **Navigation by linking:** Pages are not forced into a single parent–child tree. You build your own structure by **linking pages to each other**, which suits mind maps, diagrams, study layouts, kanban-style boards, and other visual workflows.
- **Rich content:** Notes support formatted text and common rich-media patterns (the product markets examples such as mind maps, diagrams, kanban boards, flashcards, and cheat sheets).

Together, these traits support both **deep nesting of ideas** and **flexible organization** without prescribing one hierarchy for everyone.

---

## Privacy and security (in plain language)

DeepNotes is marketed as **end-to-end encrypted**: the design intent is that the meaningful content of your notes is encrypted in a way that limits access to you and people you explicitly share with—not to casual inspection by the service operator as plain readable text.

Collaboration is part of that story: shared work is still treated as sensitive, and the product documentation describes realtime updates as being protected in transit and storage in line with the same encryption model.

For readers who want formulas, key hierarchies, and operational detail, the in-app **Whitepaper** (also reflected in the codebase) is the authoritative technical companion. This overview only states the **intent**: strong encryption and careful handling of accounts, groups, and sessions.

---

## Collaboration and groups

**Groups** are shared spaces for teamwork. Depending on plan and settings:

- **Private groups** limit visibility to members.
- **Public groups** can allow read access via links while still controlling who can edit, as described in the product’s pricing and help copy.
- **Password-protected groups** add an extra gate for people who have the password.

**Pro** subscribers can create collaborative groups, use public and private groups, password protection, **role management** for members, and **page history** (described in the product as a 14-day window for recovering or reviewing past states).

The **Basic** plan is oriented toward **personal** use: a capped number of pages (currently up to **50** in the pricing UI), with encryption and spatial note-taking still central.

---

## Plans at a glance

| Aspect | Basic | Pro |
|--------|--------|-----|
| Pages | Limited (e.g. up to 50) | Unlimited |
| Collaboration | Personal use | Groups, invitations, roles |
| Extra group features | — | Public/private, passwords, history |

Billing (web and mobile) is integrated with standard subscription flows in the product; exact prices and currency are shown on the live **Pricing** page and may change independently of this document.

---

## Where you can use DeepNotes

The same core experience is delivered across several **clients** maintained in this project: **web** (including server-rendered and single-page variants in development), **desktop** (Electron), and **mobile** (Android and iOS via Capacitor). Not every build target is required for every user; they exist so people can choose a device-native or browser workflow.

---

## Open source and community

The application is **open source**. That supports transparency, independent review of security-relevant behavior, and self-hosted or forked experiments for technically inclined users and organizations. Day-to-day users typically use the **hosted** service at deepnotes.app.

Community support and conversation are pointed to from the product’s **Help** area (for example **Discord** as a primary channel).

---

## Honest limitations (as stated in the product)

- **Offline use:** The help center currently states that **offline usage is not supported**. Sync after disconnected editing is described as a hard problem; it may be revisited later.
- **Cross-page text search:** Refer to the dedicated help article for current behavior and constraints; capabilities may evolve.

These items matter for expectations: DeepNotes is positioned as an **online-first**, **visually structured** tool with a strong privacy story—not as an offline-first archive (today).

---

## How this repository relates to the product

This monorepo contains everything needed to **build and run** the DeepNotes stack for development or deployment: the user-facing app, backend services that power accounts, pages, and billing hooks, realtime collaboration services, and shared libraries for data shapes and cryptography.

You do **not** need to read code to use DeepNotes; this folder’s documents are for orientation. For end-user how-tos, use the **Help** section on the website; for cryptographic and protocol detail, use the **Whitepaper** on the website or in the app.

---

## Summary

DeepNotes is an **open-source, encryption-minded, infinite-canvas** notes tool that favors **spatial layout**, **linked navigation**, and **optional realtime collaboration** through groups. It offers a **free personal tier** with page limits and a **paid tier** aimed at teams and power users who need unlimited pages, shared workspaces, and advanced group controls.

For the latest feature list, pricing, and policies, always prefer the live site at [deepnotes.app](https://deepnotes.app).
