---
trigger: always_on
---

# Version History

## v0.3.2 - 2025-07-31

# Graph Component Architecture

This directory contains all the necessary components, hooks, and utilities to render interactive force-directed graphs for posts and tags. The architecture is designed to be modular, stateful, and performant, encapsulating the `react-force-graph-2d` library.

## File Breakdown

### Core Components

-   **`UnifiedGraphView.tsx`**: This is the primary entry point component that should be used to render the graph. It wraps everything in a `GraphProvider` to create an isolated state instance for each graph, making it safe to use multiple graphs on the same page (e.g., in the sidebar and on the home page).

-   **`GraphProvider.tsx`**: The heart of the graph module. It uses the React Context API to provide all child components with access to the graph's state, data, and control actions. It integrates the three main hooks (`useGraphState`, `useGraphData`, `useGraphInstance`) into a single, cohesive context.

-   **`ForceGraphWrapper.tsx`**: A simple wrapper around the `react-force-graph-2d` component. It uses `React.forwardRef` to expose a limited, controlled API of the underlying library, preventing direct, uncontrolled access and improving stability.

### Views

-   **`views/PostGraphView.tsx`**: Renders the graph of posts and categories. It's responsible for the specific rendering logic (`nodeCanvasObject`), event handling (node clicks, hover effects), and applying the camera position for the post view.

-   **`views/TagGraphView.tsx`**: Renders the graph of tags. Similar to `PostGraphView`, it handles the specific rendering and event logic for the tag relationship graph.

### Hooks

-   **`hooks/useGraphState.ts`**: Manages the UI state of the graph.
    -   **Key State**: `currentView` ('post_view' or 'tag_view'), `isModalOpen`, and `zoomState`.
    -   **`zoomState`**: This is the most critical piece for maintaining the camera position. It's a dictionary that stores the `{ zoom, center }` coordinates for each `currentView`. This state is intentionally kept in-memory and is not persisted to `localStorage` to ensure a fresh state for each session.

-   **`hooks/useGraphInstance.ts`**: Manages the direct interaction with the `react-force-graph-2d` instance.
    -   **Key Functions**: It holds the `ref` to the graph instance. `getZoomState()` reads the camera's current position and zoom level, while `setZoomState()` applies a saved position. These functions are the bridge between our state management and the library itself.

-   **`hooks/useGraphData.ts`**: Responsible for fetching and transforming the raw `siteMap` data into a format that the graph can understand (`nodes` and `links`). It uses memoization and a simple cache (`graphDataProcessor`) to optimize performance.

### Utilities & Types

-   **`utils/graphDataProcessor.ts`**: Contains the pure logic for converting site and tag data into graph nodes and links.

-   **`utils/graphConfig.ts`**: A centralized configuration file for constants like node sizes, colors, and physics settings. This makes it easy to tweak the graph's appearance and behavior.

-   **`types/graph.types.ts`**: Defines all the TypeScript types and interfaces used throughout the graph components, ensuring type safety and code clarity.

## Camera Position Logic

The camera position is saved and restored using the following flow:

1.  **User Interaction**: The user pans or zooms the graph.
2.  **Event Trigger**: When the interaction ends, the `onZoomEnd` event fires in `PostGraphView` or `TagGraphView`.
3.  **Save State**: The event handler calls the `saveCurrentZoom` action from the `GraphProvider`.
4.  **Get Position**: `saveCurrentZoom` uses the `getZoomState` function from `useGraphInstance` to get the precise `zoom` and `center` from the `react-force-graph-2d` library.
5.  **Store Position**: This position is then saved in the `zoomState` object within `useGraphState`, keyed by the `currentView` (e.g., `post_view`).
6.  **View Switch**: The user clicks a button to switch from 'Post View' to 'Tag View'.
7.  **Apply State**: The `useEffect` hook in the newly activated view (e.g., `TagGraphView`) fires. It calls the `applyCurrentZoom` action.
8.  **Restore Position**: `applyCurrentZoom` retrieves the saved position for the current view from `zoomState` and uses the `setZoomState` function from `useGraphInstance` to command the library to move the camera to the saved coordinates. If no saved state is found, it defaults to fitting the whole graph in the view.


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