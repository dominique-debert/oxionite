import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { GraphContextValue } from './types/graph.types';
import { useGraphState } from './hooks/useGraphState';
import { useGraphData } from './hooks/useGraphData';
import { useGraphInstance } from './hooks/useGraphInstance';
import localeConfig from '../../site.locale.json';
import type { SiteMap } from '@/lib/context/types';
import { graphControl } from './utils/graph-control';

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

  // Graph control API listener
  useEffect(() => {
    // Determine instance type based on context usage
    // This should be enhanced to detect actual instance type from props
    const instanceType = 'sidenav';
    
    const handleControlMessage = (message: any) => {
      console.log(`[GraphProvider ${instanceType}] Received control message:`, message);
      
      if (message.instanceType === instanceType) {
        switch (message.type) {
          case 'fitToHome':
            console.log(`[GraphProvider ${instanceType}] Executing fitToHome`);
            instanceActions.zoomToFit(
              message.payload?.options?.duration,
              message.payload?.options?.padding
            );
            break;
          case 'focusNode':
            console.log(`[GraphProvider ${instanceType}] Executing focusNode:`, message.payload?.nodeId);
            if (message.payload?.nodeId) {
              instanceActions.zoomToNode(
                message.payload.nodeId,
                message.payload?.options?.duration,
                message.payload?.options?.padding
              );
            }
            break;
          case 'changeView':
            console.log(`[GraphProvider ${instanceType}] Executing changeView:`, message.payload?.view);
            if (message.payload?.view) {
              stateActions.setCurrentView(message.payload.view);
            }
            break;
        }
      }
    };

    graphControl.addListener(instanceType, handleControlMessage);
    
    return () => {
      graphControl.removeListener(instanceType, handleControlMessage);
    };
  }, [instanceActions, stateActions]);

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