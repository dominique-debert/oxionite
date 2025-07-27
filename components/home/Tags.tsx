import React from 'react';
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';

import 'reactflow/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Hello' } },
  { id: '2', position: { x: 100, y: 100 }, data: { label: 'World' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export function Tags() {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}