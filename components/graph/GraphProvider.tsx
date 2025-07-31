import React, { createContext, useContext, ReactNode } from 'react';
import type { GraphContextValue } from './types/graph.types';
import { useGraphState } from './hooks/useGraphState';
import { useGraphData } from './hooks/useGraphData';
import { useGraphInstance } from './hooks/useGraphInstance';
import type { SiteMap } from '@/lib/types';

const GraphContext = createContext<GraphContextValue | undefined>(undefined);

export interface GraphProviderProps {
  children: ReactNode;
  siteMap?: SiteMap;
  locale?: string;
}

export const GraphProvider: React.FC<GraphProviderProps> = ({
  children,
  siteMap,
  locale = 'en',
}) => {
  const graphState = useGraphState();
  const graphData = useGraphData(siteMap, locale);
  const graphInstance = useGraphInstance();

  const contextValue: GraphContextValue = {
    state: graphState.state,
    actions: {
      ...graphState.actions,
      ...graphInstance.actions,
    },
    data: {
      siteMap: siteMap!,
      postGraphData: graphData.data.postGraph,
      tagGraphData: graphData.data.tagGraph,
    },
    instance: graphInstance.instance,
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
