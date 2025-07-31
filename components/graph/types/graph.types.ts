import type { NodeObject, LinkObject } from 'react-force-graph-2d';
import type { PageInfo, SiteMap } from '@/lib/types';


export interface GraphNode extends NodeObject {
  id: string;
  name: string;
  description?: string;
  type: 'Root' | 'Category' | 'Post' | 'Home' | 'Tag';
  imageUrl?: string;
  page?: Partial<PageInfo>;
  tag?: string;
  count?: number;
  img?: HTMLImageElement;
  neighbors?: GraphNode[];
  links?: GraphLink[];
  val?: number;
}

export interface GraphLink extends LinkObject {
  source: string;
  target: string;
  value?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type GraphViewType = 'post_view' | 'tag_view';
export type GraphDisplayType = 'sidebar' | 'fullscreen' | 'home';

export interface GraphState {
  currentView: GraphViewType;
  displayType: GraphDisplayType;
  isModalOpen: boolean;
  zoomState: Record<string, { zoom: number; center: { x: number; y: number } }>;
  isGraphLoaded: boolean;
  currentTag?: string;
}

export interface GraphContextValue {
  state: GraphState;
  actions: {
    setCurrentView: (view: GraphViewType) => void;
    setDisplayType: (type: GraphDisplayType) => void;
    setIsModalOpen: (open: boolean) => void;
    applyZoomState: (view: GraphViewType) => void;
    setIsGraphLoaded: (loaded: boolean) => void;
    setCurrentTag: (tag?: string) => void;
    zoomToFit: (duration?: number, padding?: number, nodeFilter?: (node: any) => boolean) => void;
    zoomToNode: (nodeId: string, duration?: number, padding?: number) => void;
    getZoomState: () => { zoom: number; center: { x: number; y: number } } | null;
    saveZoomState: (view: GraphViewType) => void;
    resetZoomState: (view?: GraphViewType) => void;

    pauseAnimation: () => void;
    resumeAnimation: () => void;
  };
  data: {
    siteMap: SiteMap;
    postGraphData: GraphData;
    tagGraphData: GraphData;
  };
  instance: {
    graphRef: React.RefObject<any>;
    setGraphInstance: (instance: any) => void;
  };
}
