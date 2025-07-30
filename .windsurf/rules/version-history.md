---
trigger: always_on
---

# Version History

## v0.3.1 (Production Build Fix) - 2025-07-30

### 🐛 Bug Fixes & Production Readiness

- **Fixed all build errors and TypeScript issues** to achieve clean production build
- **Resolved ESLint warnings** including unused variables and React hook dependencies
- **Fixed hierarchical subpage routing** with full Notion page IDs in URLs
- **Fixed breadcrumb navigation** to display actual Notion page titles instead of raw slugs

### 🔧 Technical Fixes

- **Build System**: Fixed all TypeScript compilation errors and ESLint warnings
- **URL Structure**: Consistent `/post/{slug}` for posts and `/post/{root-slug}/{subpage-slug}` for subpages
- **Breadcrumbs**: Updated to use actual Notion page titles from recordMap with proper fallbacks
- **Code Quality**: Fixed unused variable errors, for-loop conventions, and React hook dependencies
- **Type Safety**: Resolved all null/undefined handling issues across the codebase

### ✅ Verification

- `npm run build` completes successfully (exit code 0)
- `npm run test:lint` passes with only 1 non-blocking warning
- Hierarchical routing works correctly for nested subpages
- Breadcrumbs display accurate page titles from Notion
- Production-ready codebase achieved

### 🎯 Impact

The codebase is now fully production-ready with robust hierarchical routing and accurate breadcrumb navigation that reflects the actual Notion page hierarchy and titles.

## v0.1.0 (Initial Rework) - 2025-06-26

This is the first major release of the refactored Next.js Notion Starter Kit, designed to provide a more structured and powerful foundation for building blogs. The core of the starter kit has been overhauled to move from a simple page-based structure to a robust, single-database architecture in Notion.

### ✨ New Features

*   **Database-Centric Architecture**: All content, including posts and categories, is now managed from a single Notion database. This allows for rich, relational data management.
*   **Hierarchical "Folder-Style" Categories**: You can now create multi-level categories using a `Parent/Children` relationship within the Notion database. The site's navigation structure is automatically generated from this hierarchy.
*   **Built-in Multilingual Support**: The database schema is designed for i18n. You can create content in multiple languages and link them together as translations.
*   **Global Navigation Tree**: A full sitemap, including the category hierarchy, is generated at build time and is available to all pages, enabling features like a persistent navigation sidebar.
*   **Layout with Sidebar**: The default layout now includes a dedicated sidebar area to display the category navigation tree.

### ♻️ Refactoring

*   **Complete Overhaul of `getSiteMap`**: The data fetching logic has been entirely rewritten. Instead of crawling pages, it now performs a single, efficient query to the Notion database and processes all relationships in memory, significantly improving build logic and performance.
*   **Centralized Data Flow**: The generated `siteMap` object is now passed down from `_app.tsx`, making site-wide data globally accessible to all page components.
*   **Updated Type Definitions**: All TypeScript types in `lib/types.ts` have been updated to reflect the new, more structured data model.