/**
 * Graph Control API
 * High-level API for external control of graph instances
 * Provides a unified interface for URL-based focusing, hover interactions, and modal state management
 */

import type { GraphViewType } from '../types/graph.types';
import { GRAPH_CONFIG } from '../utils/graphConfig';

export interface GraphControlMessage {
  type: 'fitToHome' | 'focusNode' | 'focusNodes' | 'changeView' | 'highlightNodes' | 'clearHighlight' | 'focusBySlug';
  instanceType: 'sidenav' | 'home';
  payload?: any;
}

export interface FocusTarget {
  type: 'node' | 'nodes' | 'category' | 'tag' | 'post';
  id?: string;
  ids?: string[];
  tags?: string[];
}

export interface GraphControlOptions {
  duration?: number;
  padding?: number;
  highlightBorder?: boolean;
}

/**
 * High-level graph control API
 * Manages communication between external components (routing, UI) and graph instances
 */
class GraphControlAPI {
  private instanceState: Map<string, any> = new Map();
  private listeners: Map<string, Array<(message: any) => void>> = new Map();
  private focusIntervals: Map<string, NodeJS.Timeout> = new Map();
  private instanceStates: Map<string, {
    currentView: GraphViewType;
    focusTarget: FocusTarget | null;
    isModalOpen: boolean;
  }> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__graphControl = this;
    }
  }

  /**
   * Send control message to specific graph instance
   */
  private sendMessage(message: GraphControlMessage) {
    console.log(`[GraphControl] Sending to ${message.instanceType}:`, message);
    const listeners = this.listeners.get(message.instanceType) || [];
    listeners.forEach(listener => listener(message));
  }

  /**
   * Register listener for specific instance
   */
  addListener(instanceType: string, callback: (message: GraphControlMessage) => void) {
    if (!this.listeners.has(instanceType)) {
      this.listeners.set(instanceType, []);
    }
    this.listeners.get(instanceType)!.push(callback);
  }

  /**
   * Remove listener for specific instance
   */
  removeListener(instanceType: string, callback: (message: GraphControlMessage) => void) {
    const listeners = this.listeners.get(instanceType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Update instance state
   */
  updateInstanceState(instanceType: string, state: Partial<{
    currentView: GraphViewType;
    focusTarget: FocusTarget | null;
    isModalOpen: boolean;
  }>) {
    const current = this.instanceStates.get(instanceType) || {
      currentView: 'post_view',
      focusTarget: null,
      isModalOpen: false,
    };
    
    this.instanceStates.set(instanceType, { ...current, ...state });
  }

  /**
   * Handle URL-based routing
   */
  handleUrlRouting(pathname: string, instanceType: 'sidenav' | 'home' = 'sidenav') {
    console.log(`[GraphControl] Handling URL: ${pathname} for ${instanceType}`);
    
    // Parse URL path without creating URL object to avoid hostname issues
    const segments = pathname.split('/').filter(Boolean);
    
    let targetView: GraphViewType = 'post_view';
    let focusTarget: FocusTarget | null = null;

    if (segments.length === 0) {
      // Root path: / - no focus
      focusTarget = null;
    } else if (segments[0] === 'post' && segments[1]) {
      // /post/{slug} or /post/{slug}/{subpage}
      targetView = 'post_view';
      focusTarget = { type: 'post', id: segments[1] };
    } else if (segments[0] === 'category' && segments[1]) {
      // /category/{slug}
      targetView = 'post_view';
      focusTarget = { type: 'category', id: segments[1] };
    } else if (segments[0] === 'tag' && segments[1]) {
      // /tag/{tag}
      targetView = 'tag_view';
      focusTarget = { type: 'tag', id: segments[1] };
    } else if (segments[0] === 'all-tags') {
      // /all-tags - no focus
      targetView = 'tag_view';
      focusTarget = null;
    }

    // Send appropriate messages
    if (targetView !== this.instanceStates.get(instanceType)?.currentView) {
      this.changeView(targetView, instanceType);
    }

    if (focusTarget) {
      this.focusOnTarget(focusTarget, instanceType);
    } else {
      this.fitToHome(instanceType);
    }
  }

  /**
   * High-level control methods
   */
  fitToHome(instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'fitToHome',
      instanceType,
      payload: options
    });
  }

  focusOnTarget(target: FocusTarget, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    switch (target.type) {
      case 'node':
      case 'post':
      case 'category':
        if (target.id) {
          this.focusBySlug(target.id, instanceType, options);
        }
        break;
      case 'tag':
        if (target.id) {
          this.focusNode(target.id, instanceType, options);
        }
        break;
      case 'nodes':
        if (target.ids) {
          this.focusNodes(target.ids, instanceType, options);
        }
        break;
    }
  }

  focusNode(nodeId: string, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'focusNode',
      instanceType,
      payload: { nodeId, options }
    });
  }

  focusBySlug(slug: string, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'focusBySlug',
      instanceType,
      payload: { slug, options }
    });
  }

  focusNodes(nodeIds: string[], instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    this.sendMessage({
      type: 'focusNodes',
      instanceType,
      payload: { nodeIds, options }
    });
  }

  changeView(view: GraphViewType, instanceType: 'sidenav' | 'home' = 'sidenav') {
    this.updateInstanceState(instanceType, { currentView: view });
    this.sendMessage({
      type: 'changeView',
      instanceType,
      payload: { view }
    });
  }

  /**
   * Sequential operation: change view and then focus by slug with continuous retry
   */
  changeViewAndFocusBySlug(view: GraphViewType, slug: string, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    const currentState = this.instanceStates.get(instanceType);
    const needsViewChange = !currentState || currentState.currentView !== view;
    
    if (needsViewChange) {
      this.changeView(view, instanceType);
      
      // Let GraphProvider handle the 50 retry attempts internally
      setTimeout(() => {
        this.sendMessage({
          type: 'focusBySlug',
          instanceType,
          payload: { slug, options, continuous: true }
        });
      }, 50);
    } else {
      // View type is already correct, focus directly without continuous retry
      this.focusBySlug(slug, instanceType, options);
    }
  }



  /**
   * Sequential operation: change view and then focus node with continuous retry
   */
  changeViewAndFocusNode(view: GraphViewType, nodeId: string, instanceType: 'sidenav' | 'home' = 'sidenav', options?: GraphControlOptions) {
    const currentState = this.instanceStates.get(instanceType);
    const needsViewChange = !currentState || currentState.currentView !== view;
    
    if (needsViewChange) {
      this.changeView(view, instanceType);
      
      // Let GraphProvider handle the 50 retry attempts internally
      setTimeout(() => {
        this.sendMessage({
          type: 'focusNode',
          instanceType,
          payload: { nodeId, options, continuous: true }
        });
      }, 50);
    } else {
      // View type is already correct, focus directly without continuous retry
      this.focusNode(nodeId, instanceType, options);
    }
  }

  highlightNodes(nodeIds: string[], instanceType: 'sidenav' | 'home' = 'sidenav') {
    this.sendMessage({
      type: 'highlightNodes',
      instanceType,
      payload: { nodeIds }
    });
  }

  clearHighlight(instanceType: 'sidenav' | 'home' = 'sidenav') {
    this.sendMessage({
      type: 'clearHighlight',
      instanceType
    });
  }

  /**
   * Handle modal open/close events
   */
  handleModalToggle(isOpen: boolean, instanceType: 'sidenav' | 'home' = 'sidenav') {
    this.updateInstanceState(instanceType, { isModalOpen: isOpen });
    
    // When modal opens/closes, maintain focus if available
    const state = this.instanceStates.get(instanceType);
    if (state?.focusTarget) {
      this.focusOnTarget(state.focusTarget, instanceType);
    } else {
      this.fitToHome(instanceType);
    }
  }

  /**
   * Handle hover interactions from CategoryTree and TagButton
   */
  handleHover(hoverData: {
    type: 'category' | 'tag' | 'post';
    id: string;
    instanceType: 'sidenav' | 'home';
  }) {
    const { type, id, instanceType } = hoverData;
    
    if (type === 'category' || type === 'post') {
      this.changeView('post_view', instanceType);
      this.focusNode(id, instanceType);
    } else if (type === 'tag') {
      this.changeView('tag_view', instanceType);
      this.focusNode(id, instanceType);
    }
  }

  /**
   * Debug helpers for development
   */
  debug() {
    console.log('[GraphControl] Current state:', {
      listeners: Array.from(this.listeners.keys()),
      instanceStates: Array.from(this.instanceStates.entries())
    });
  }
}

export const graphControl = new GraphControlAPI();
