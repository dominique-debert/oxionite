import { useState, useCallback, useEffect } from 'react';
import type { GraphState, GraphViewType, GraphDisplayType } from '../types/graph.types';

const GRAPH_STATE_STORAGE_KEY = 'graph-view-state';

const loadInitialState = (): Partial<GraphState> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(GRAPH_STATE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Failed to load graph state from localStorage:', err);
  }
  
  return {};
};

export const useGraphState = () => {
  const [state, setState] = useState<GraphState>(() => {
    const saved = loadInitialState();
    return {
      currentView: 'post_view',
      displayType: 'home',
      isModalOpen: false,
      zoomState: {},
      isGraphLoaded: false,
      currentTag: undefined,
      ...saved,
    };
  });

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(GRAPH_STATE_STORAGE_KEY, JSON.stringify({
          currentView: state.currentView,
          zoomState: state.zoomState,
        }));
      } catch (err) {
        console.error('Failed to save graph state to localStorage:', err);
      }
    }
  }, [state.currentView, state.zoomState]);

  const setCurrentView = useCallback((view: GraphViewType) => {
    setState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setDisplayType = useCallback((type: GraphDisplayType) => {
    setState(prev => ({ ...prev, displayType: type }));
  }, []);

  const setIsModalOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, isModalOpen: open }));
  }, []);

  const setZoomState = useCallback((view: GraphViewType, zoom: number, center: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      zoomState: {
        ...prev.zoomState,
        [view]: { zoom, center }
      }
    }));
  }, []);

  const setIsGraphLoaded = useCallback((loaded: boolean) => {
    setState(prev => ({ ...prev, isGraphLoaded: loaded }));
  }, []);

  const setCurrentTag = useCallback((tag?: string) => {
    setState(prev => ({ ...prev, currentTag: tag }));
  }, []);

  const resetZoomState = useCallback((view?: GraphViewType) => {
    if (view) {
      setState(prev => ({
        ...prev,
        zoomState: {
          ...prev.zoomState,
          [view]: { zoom: 1, center: { x: 0, y: 0 } }
        }
      }));
    } else {
      setState(prev => ({ ...prev, zoomState: {} }));
    }
  }, []);

  // These methods are implemented in useGraphInstance and will be merged in GraphProvider

  return {
    state,
    actions: {
      setCurrentView,
      setDisplayType,
      setIsModalOpen,
      setZoomState,
      setIsGraphLoaded,
      setCurrentTag,
      resetZoomState,
    },
  };
};
