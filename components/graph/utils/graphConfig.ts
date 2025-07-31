export const GRAPH_CONFIG = {
  // Visual styling
  visual: {
    HOME_NODE_SIZE: 16,
    CATEGORY_NODE_SIZE: 10,
    POST_NODE_SIZE: 4,
    TAG_NODE_SIZE: 6,
    NODE_INNER_BORDER_WIDTH: 0.3,
    NODE_OUTER_BORDER_WIDTH: 0.3,
    HOME_CORNER_RADIUS: 16,
    CATEGORY_CORNER_RADIUS: 2,
    LINK_WIDTH: 0.1,
    HOVER_OPACITY: 0.1,
    HOME_NAME_FONT_SIZE: 4,
    CATEGORY_FONT_SIZE: 2,
    POST_FONT_SIZE: 1,
    TAG_NAME_FONT_SIZE: 2,
  },

  // Zoom configuration
  zoom: {
    HOME_NODE_ZOOM: 3,
    CATEGORY_NODE_ZOOM: 5,
    POST_NODE_ZOOM: 10,
    TAG_NODE_ZOOM: 8,
    BASE_NODE_SIZE: 4,
    DEFAULT_PADDING: 50,
    ANIMATION_DURATION: 400,
  },

  // Physics engine
  physics: {
    cooldownTicks: 100,
    warmupTicks: 50,
    d3AlphaDecay: 0.02,
    d3VelocityDecay: 0.3,
    linkDistance: 30,
    linkStrength: 1,
    nodeRepulsion: 15,
  },

  // Performance
  performance: {
    maxNodes: 1000,
    maxLinks: 2000,
    debounceDelay: 16, // ~60fps
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
  },

  // Responsive breakpoints
  responsive: {
    sidebar: { width: 300, height: 300 },
    fullscreen: { minWidth: 400, minHeight: 400 },
    home: { width: 800, height: 600 },
  },
} as const;

export const HOME_NODE_ID = '__HOME__';

// Color schemes for different themes with glassmorphism
export const GRAPH_COLORS = {
  light: {
    link: 'rgba(0, 0, 0, 0.3)',
    linkHover: 'rgba(0, 0, 0, 0.1)',
    linkMinor: 'rgba(0, 0, 0, 0.05)',
    text: 'rgb(50, 48, 44)',
    highlight: '#f59e0b',
    node: 'rgba(255, 255, 255, 0.25)',
    nodeInnerBorder: 'rgba(255, 255, 255, 0.18)',
    nodeOuterBorder: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    link: 'rgba(255, 255, 255, 0.1)',
    linkHover: 'rgba(255, 255, 255, 0.1)',
    linkMinor: 'rgba(255, 255, 255, 0.05)',
    text: 'rgba(255, 255, 255, 0.9)',
    highlight: '#fbbf24',
    node: 'rgba(0, 0, 0, 0.3)',
    nodeInnerBorder: 'rgba(0, 0, 0, 0.3)',
    nodeOuterBorder: 'rgba(255, 255, 255, 0.1)',
    // node: 'rgba(0, 0, 255, 0.1)',
    // nodeInnerBorder: 'rgba(255, 0, 0, 0.1)',
    // nodeOuterBorder: 'rgba(0, 255, 0, 0.1)',
  },
};
