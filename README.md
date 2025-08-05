# Next Notion Engine

---

## Developer Handover Document: Build Error Resolution and Routing Bug Analysis

**Objective:** Resolve all build errors from the initial state while preserving the critical client-side routing functionality.

### 1. Initial Problem State

The project build currently fails with a series of ESLint errors and warnings. The complete list of initial errors can be found in the user's prompt. At this stage, despite the build errors, the application's client-side routing (using Next.js `<Link>`) functions correctly.

### 2. The Routing Bug Incident

During previous attempts to fix the build errors, a critical regression bug was introduced: client-side routing broke. When a user clicked a `<Link>`, the URL in the browser would update, but the page content would not re-render until a manual refresh.

### 3. Root Cause Analysis

The routing bug was caused by incorrect modifications made to fix `react-hooks/exhaustive-deps` warnings, which led to **Stale Closures** in React components responsible for managing and reacting to route changes.

- **The Core Issue:** The logic to handle URL changes is distributed across `GraphProvider.tsx` and `UnifiedGraphView.tsx`. Several `useEffect` and `useCallback` hooks in these components depend on the `router` object. The initial, correct implementation relied on values like `router.asPath` being in the dependency arrays of these hooks. This ensured that whenever the URL changed, any functions inside these hooks were re-created with the new, current URL and state.

- **The Mistake:** In an attempt to satisfy the `exhaustive-deps` lint rule, `router.asPath` was removed from some of these dependency arrays. This caused the functions (`handleRouteChange`, `handleFocusCurrent`, etc.) to be created only once, capturing the initial URL and state. When the route changed, these old functions were still being called, but they were operating with stale data, thus failing to trigger a re-render.

- **The Flawed Correction:** Subsequent attempts to fix this by re-adding `router.asPath` to some, but not all, of the necessary dependency arrays, or by creating conflicting `useEffect` hooks in both `GraphProvider` and `UnifiedGraphView`, only exacerbated the problem by creating race conditions and unpredictable behavior.

### 4. Recommended Strategy for Resolution

To fix the build errors without re-introducing the routing bug, the following methodical approach is required. The key is to respect the `exhaustive-deps` rule while strategically disabling it where functionally necessary.

**Step-by-step plan:**

1.  **`no-case-declarations` (`GraphProvider.tsx`):** For each `case` block in the `switch` statement that contains a lexical declaration (`let`, `const`), wrap the block's content in curly braces `{}`. For cases without declarations, do not add braces.

2.  **`unicorn/prefer-set-has` & `unicorn/no-for-loop` (`UnifiedGraphView.tsx`, `graph-control.ts`):**
    -   Convert arrays like `['post', 'category', 'tag']` that are used for inclusion checks into a `new Set(['post', 'category', 'tag'])`.
    -   Replace the corresponding `.includes()` checks with `.has()`.
    -   Refactor standard `for (let i = 0; ...)` loops into `for...of` loops where appropriate.

3.  **`react-hooks/exhaustive-deps` (The Critical Part):**
    -   **Analyze each warning individually.** Add the suggested dependencies to the array.
    -   **CRITICAL EXCEPTION:** In `GraphProvider.tsx` and `UnifiedGraphView.tsx`, for any `useEffect` or `useCallback` hook that directly or indirectly handles route changes, **you must include `router.asPath` in the dependency array.**
    -   If adding `router.asPath` (or other dependencies like `instance.graphRef`) re-introduces the `exhaustive-deps` warning, it is a signal that this is a necessary dependency for correct functionality. In this specific case, **disable the lint rule for that line only** using the comment:
        ```javascript
        // eslint-disable-next-line react-hooks/exhaustive-deps
        ```
    -   This approach correctly informs ESLint that you are intentionally breaking the rule for a valid reason, preventing future developers from accidentally "fixing" it and re-introducing the bug.

4.  **Other Minor Errors:**
    -   **`object-shorthand`:** Change `key: key` to `key`.
    -   **`simple-import-sort/exports`:** Manually reorder the `export` statements as suggested by the error.
    -   **`unicorn/prefer-math-min-max`:** Replace `a > b ? a : b` with `Math.max(a, b)`.
    -   **`@typescript-eslint/consistent-generic-constructors`:** Change `new Map<K, V>()` to `new Map<K, V>()`.

By following this strategy, all build errors will be resolved, and the critical client-side routing functionality will be preserved. The key is understanding *why* the `exhaustive-deps` rule exists but also knowing when its violation is necessary for the correct runtime behavior of the application.
