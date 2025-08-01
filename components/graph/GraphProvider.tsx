import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import type { GraphContextValue } from './types/graph.types';
import { useGraphState } from './hooks/useGraphState';
import { useGraphData } from './hooks/useGraphData';
import { useGraphInstance } from './hooks/useGraphInstance';
import localeConfig from '../../site.locale.json';
import type { SiteMap } from '@/lib/context/types';

const GraphContext = createContext<GraphContextValue | undefined>(undefined);

export interface GraphProviderProps {
  children: ReactNode;
  siteMap?: SiteMap;
  locale?: string;
}

export const GraphProvider: React.FC<GraphProviderProps> = ({ 
  children, 
  siteMap, 
  locale = localeConfig.defaultLocale 
}) => {
  const { state, actions: stateActions } = useGraphState();
  const graphData = useGraphData(siteMap, locale);
  const { instance, actions: instanceActions } = useGraphInstance();

  const saveCurrentZoom = useCallback(() => {
    const zoomState = instanceActions.getZoomState();
    if (zoomState) {
      stateActions.setZoomStateForView(state.currentView, zoomState);
    }
  }, [instanceActions, stateActions, state.currentView]);

  const applyCurrentZoom = useCallback((fitView = false) => {
    const savedZoom = state.zoomState[state.currentView];
    if (savedZoom && !fitView) {
      instanceActions.setZoomState(savedZoom.zoom, savedZoom.center);
    } else {
      instanceActions.zoomToFit();
    }
  }, [instanceActions, state.zoomState, state.currentView]);

  const contextValue: GraphContextValue = {
    state,
    actions: {
      ...stateActions,
      ...instanceActions,
      saveCurrentZoom,
      applyCurrentZoom,
    },
    data: {
      siteMap: siteMap!,
      postGraphData: graphData.data.postGraph,
      tagGraphData: graphData.data.tagGraph,
    },
    instance,
  };

  return (
    <GraphContext.Provider value={contextValue}>
      {children}
    </GraphContext.Provider>
  );
};

export const useGraphContext = () => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphContext must be used within a GraphProvider');
  }
  return context;
};