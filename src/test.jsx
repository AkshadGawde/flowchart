const defaultJsonData = {
  steps: [
    {
      id: "step-1",
      name: "Step 1",
      nodes: [
        {
          id: "node-1",
          label: "Start Node",
          position: { x: 0, y: 0 }
        },
        {
          id: "subnode-1",
          label: "Sub Node A",
          position: { x: 100, y: 100 }
        },
        {
          id: "subnode-2",
          label: "Sub Node B",
          position: { x: 100, y: 200 }
        },
        {
          id: "node-2",
          label: "Process Node",
          position: { x: 0, y: 150 }
        },
        {
          id: "node-3",
          label: "Decision Node",
          position: { x: 300, y: 0 }
        }
      ]
    }
  ],
  edges: [
    { source: "node-1", target: "subnode-1", relationship: "default" },
    { source: "node-1", target: "subnode-2", relationship: "default" },
    { source: "node-1", target: "node-2", relationship: "default" },
    { source: "node-2", target: "node-3", relationship: "default" },
    { source: "subnode-1", target: "node-3", relationship: "default" }
  ]
};

export default defaultJsonData;
