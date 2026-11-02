# 0003 The generated data is in git

Date: 2026-11-02
Decided by: orchestrator
Status: accepted

## Context

The game files are not in git: `extracted/` comes from the Steam install of the owner. The site must build on GitHub Actions to deploy to GitHub Pages. GitHub Actions has no game files.

## Decision

The model step writes the entities as JSON and the icons as PNG to `data/`, and `data/` is in git. The site build on GitHub Actions reads `data/`.

Rejected option: build the site on the machine of the owner and push the output to a `gh-pages` branch. Then a deploy needs that 1 machine, and a change to the data shows no diff in a review.

## Consequences

`data/` holds only output of the model step. The game files stay out of git. The site publishes the same data and icons as the public workbook.
