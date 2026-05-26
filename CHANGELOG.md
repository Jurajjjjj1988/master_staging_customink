# Changelog

## v1.0.0 (2026-03-23)

### Initial Release

#### Test Coverage

- **Homepage** — hero section, search form (3 fields + submit), listing sections, header navigation
- **Search** — autocomplete location input, results match searched location, page heading verification
- **Sort** — price ascending order verification after sorting by cheapest
- **Navigation** — post ad link navigation, logo back to homepage
- **Map** — map visible on desktop (1280px), hidden on mobile (375px)
- **Responsive** — mobile layout: search form accessible, edit button visible, map hidden
- **Login** — login via modal with email/password, verify modal closes after success
- **Profile** — edit personal data (name, occupation, year of birth, about me), save, reload and verify persistence

#### Architecture

- Page Object Model with `BasePage` abstraction
- Playwright fixtures for POM injection
- Helper functions for data parsing (`helpers/parsers.ts`)
- Centralized test data with environment-based credentials
- Cookie consent auto-dismiss in `BasePage.dismissOverlay()`

#### CI/CD

- GitHub Actions pipeline (push, PR, scheduled Mon-Fri 8:00 UTC, manual trigger)
- HTML report deployed to GitHub Pages
- JSON reporter for test statistics
- Slack Block Kit notifications (failure with details, success on push)
- Playwright browser caching for faster CI runs
- Concurrency control to cancel stale runs

#### Code Quality

- ESLint with typescript-eslint
- Prettier formatting
- Husky pre-commit hook (lint check)
