import React, { useCallback, useState, useEffect, useRef } from "react";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";

import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  updateEdge,
  useReactFlow,
  getRectOfNodes,
  getTransformForBounds,
} from "reactflow";
import ContextMenu from "./ContextMenu";
import { toPng } from "html-to-image";
import "reactflow/dist/style.css";
import { BiSolidDockLeft } from "react-icons/bi";
import { FaHeart } from "react-icons/fa";
import { useGlobalContext } from "./context";
import "reactflow/dist/style.css";
import defaultJsonData from "./test";

// const defaultJsonData = {
//   "steps": [
//     {
//       "id": "step-1",
//       "name": "Step 1",
//       "nodes": [
//         {
//           "id": "node-1",
//           "label": "Start Node",
//           "position": {
//             "x": 0,
//             "y": 0
//           }
//         },
//         {
//           "id": "subnode-1",
//           "label": "Sub Node A",
//           "position": {
//             "x": 100,
//             "y": 100
//           }
//         },
//         {
//           "id": "subnode-2",
//           "label": "Sub Node B",
//           "position": {
//             "x": 100,
//             "y": 200
//           }
//         },
//         {
//           "id": "node-2",
//           "label": "Process Node",
//           "position": {
//             "x": 0,
//             "y": 150
//           }
//         },
//         {
//           "id": "node-3",
//           "label": "Decision Node",
//           "position": {
//             "x": 300,
//             "y": 0
//           }
//         }
//       ]
//     }
//   ],
//   "edges": [
//     {
//       "source": "node-1",
//       "target": "subnode-1",
//       "relationship": "default"
//     },
//     {
//       "source": "node-1",
//       "target": "subnode-2",
//       "relationship": "default"
//     },
//     {
//       "source": "node-1",
//       "target": "node-2",
//       "relationship": "default"
//     },
//     {
//       "source": "node-2",
//       "target": "node-3",
//       "relationship": "default"
//     },
//     {
//       "source": "subnode-1",
//       "target": "node-3",
//       "relationship": "default"
//     }
//   ]
// };





function downloadImage(dataUrl) {
  const a = document.createElement("a");

  a.setAttribute("download", "flowchart.png");
  a.setAttribute("href", dataUrl);
  a.click();
}
const imageWidth = 1024;
const imageHeight = 768;
const Content = () => {
  const { isSidebarOpen, closeSidebar } = useGlobalContext();
  const [nodes, setNodes,] = useNodesState([]);
  const [edges, setEdges,] = useEdgesState([]);
  
  const [nodeName, setNodeName] = useState();
  const [nodeId, setNodeId] = useState();
  const [nodeColor, setNodeColor] = useState("#ffffff");
  const [selectedElements, setSelectedElements] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const edgeUpdateSuccessful = useRef(true);
  const [menu, setMenu] = useState(null);
  const ref = useRef(null);
  const [newNodeInput, setNewNodeInput] = useState({
    id: "",
    name: "",
    color: "#ffffff",
  });
  const { setViewport } = useReactFlow();
  const { getNodes } = useReactFlow();
  const onClick = () => {
    // we calculate a transform for the nodes so that all nodes are visible
    // we then overwrite the transform of the `.react-flow__viewport` element
    // with the style option of the html-to-image library
    const nodesBounds = getRectOfNodes(getNodes());
    const transform = getTransformForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2
    );

    toPng(document.querySelector(".react-flow__viewport"), {
      backgroundColor: "#eef",
      width: imageWidth,
      height: imageHeight,
      style: {
        width: imageWidth,
        height: imageHeight,
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
    }).then(downloadImage);
  };
 

  const onNodesChange = useCallback((changes) => {
    saveToHistory(); // Save state before changing nodes
    setNodes((prevNodes) => applyNodeChanges(changes, prevNodes));
  }, [setNodes]);
  const onEdgesChange = useCallback((changes) => {
    saveToHistory(); // Save state before changing edges
    setEdges((prevEdges) => applyEdgeChanges(changes, prevEdges));
  }, [setEdges]);
    
  const undo = () => {
    if (history.length === 0) return; // Nothing to undo
  
    const lastState = history[history.length - 1]; // Get last saved state
    setFuture((prevFuture) => [{ nodes, edges }, ...prevFuture]); // Save current state for redo
    setNodes(lastState.nodes); // Restore nodes
    setEdges(lastState.edges); // Restore edges
    setHistory((prevHistory) => prevHistory.slice(0, -1)); // Remove last history item
  };
  
  const redo = () => {
    if (future.length === 0) return; // Nothing to redo
  
    const nextState = future[0]; // Get next saved state
    setHistory((prevHistory) => [...prevHistory, { nodes, edges }]); // Save current state for undo
    setNodes(nextState.nodes); // Restore nodes
    setEdges(nextState.edges); // Restore edges
    setFuture((prevFuture) => prevFuture.slice(1)); // Remove first redo item
  };
  
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "z") {
        event.preventDefault();
        undo();
      }
      if (event.ctrlKey && event.key === "y") {
        event.preventDefault();
        redo();
      }
    };



    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
  
  
  const [id, setId] = useState(0);

  const getId = useCallback(() => {
    setId((prevId) => prevId + 1);
    return `node_${id}`;
  }, [id]);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      // Prevent native context menu from showing
      event.preventDefault();

      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      const pane = ref.current.getBoundingClientRect();
      setMenu({
        id: node.id,
        top: event.clientY < pane.height - 200 && event.clientY - 60,
        left:
          event.clientX < pane.width - 200 &&
          (isSidebarOpen ? event.clientX - 300 : event.clientX),
        right:
          event.clientX >= pane.width - 200 &&
          pane.width - (isSidebarOpen ? event.clientX - 300 : event.clientX),
        bottom:
          event.clientY >= pane.height - 200 &&
          pane.height - event.clientY + 70,
      });
    },
    [setMenu, isSidebarOpen]
  );

  // Close the context menu if it's open whenever the window is clicked.
  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  // Handle node click
  const onNodeClick = useCallback((event, node) => {
    setSelectedElements([node]);
    setNodeName(node.data.label);
    setNodeId(node.id);
    setNodeColor(node.style?.background || "#ffffff"); // Prevents crash if style is missing
  }, []);
  
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => {
      edgeUpdateSuccessful.current = true;
      setEdges((els) =>
        updateEdge(oldEdge, newConnection, els.map(edge => ({
          ...edge,
          animated: edge.id === newConnection.id ? true : edge.animated,
        })))
      );
    },
    [setEdges]
  );
  

  const onEdgeUpdateEnd = useCallback(
    (_, edge) => {
      if (!edgeUpdateSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }

      edgeUpdateSuccessful.current = true;
    },
    [setEdges]
  );
  

  const handleCreateNode = () => {
    const newNode = {
      id: newNodeInput.id.length > 0 ? newNodeInput.id : getId(),
      position: { x: 400, y: 50 }, // You can set the initial position as needed
      data: {
        label:
          newNodeInput.name.length > 0 ? newNodeInput.name : "Default Name",
      },
      style: {
        background:
          newNodeInput.color.length > 0 ? newNodeInput.color : nodeColor, // Default color
      },
    };
    setNodes((prevNodes) => [...prevNodes, newNode]);
    setNewNodeInput({ id: "", name: "", color: "#ffffff" });
  };


  const processJSONData = (jsonData) => {
    const loadedNodes = [];
    const loadedEdges = [];
    const stepSpacing = 400; // Increased horizontal space
    const nodeSpacing = 200; // Increased vertical space
    let stepIndex = 0;
  
    jsonData.steps.forEach((step) => {
      let nodeIndex = 0;
  
      step.nodes.forEach((node) => {
        const parentPosition = { x: stepIndex * stepSpacing, y: nodeIndex * nodeSpacing };
  
        loadedNodes.push({
          id: node.id,
          data: { label: node.label },
          position: parentPosition ?? { x: 0, y: 0 },
        });
  
        node.subNodes?.forEach((subNode, subIndex) => {
          const subNodePosition = {
            x: parentPosition.x + 150, // Shift subnodes to the right
            y: parentPosition.y + (subIndex + 1) * 150, // More spacing
          };
  
          loadedNodes.push({
            id: subNode.id,
            data: { label: subNode.label },
            position: subNodePosition ?? { x: 0, y: 0 },
            parentId: node.id,
          });
  
          loadedEdges.push({ source: node.id, target: subNode.id, animated: true });
        });
  
        nodeIndex++;
      });
  
      stepIndex++;
    });
  
    jsonData.edges.forEach((edge) => {
      loadedEdges.push({ source: edge.source, target: edge.target, animated: true });
    });
  
    setNodes(loadedNodes);
    setEdges(loadedEdges);
  };
  
  

  
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        processJSONData(jsonData); // Load new JSON file
      } catch (error) {
        console.error("Invalid JSON file:", error);
        alert("Invalid JSON format. Please upload a valid JSON file.");
      }
    };
    reader.readAsText(file);
  };
  
  
  
  

  const handleUpdateNode = (event) => {
    const { name, value } = event.target;
  
    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, [name]: value },
              style: {
                ...n.style,
                background: name === "background" ? value : n.style?.background,
              },
            }
          : n
      )
    );
  
    if (name === "name") setNodeName(value);
    if (name === "background") setNodeColor(value);
  };
  

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      // reactFlowInstance.project was renamed to reactFlowInstance.screenToFlowPosition
      // and you don't need to subtract the reactFlowBounds.left/top anymore
      // details: https://reactflow.dev/whats-new/2023-11-10
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
        style: {
          background: "#ffffff",
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, getId, setNodes]
  );

  const flowKey = "example-flow";

  const defaultFlowchart = {
    nodes: [
      {
        id: "node-1",
        data: { label: "Welcome" },
        position: { x: 100, y: 100 }
      },
      {
        id: "node-2",
        data: { label: "This is a preloded nodes" },
        position: { x: 300, y: 100 }
      }
    ],
    edges: [
      { source: "node-1", target: "node-2", animated: true }
    ]
  };
  
  const onSave = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      localStorage.setItem(flowKey, JSON.stringify(flow));
      alert("Flowchart saved successfully!");
    }
  }, [reactFlowInstance]);
  
  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      const savedFlow = localStorage.getItem(flowKey);
      
      if (!savedFlow) {
        alert("No saved flowchart found. Loading tutorial...");
        setNodes(defaultFlowchart.nodes);
        setEdges(defaultFlowchart.edges);
        return;
      }
      
      try {
        const flow = JSON.parse(savedFlow);
        const { x = 0, y = 0, zoom = 1 } = flow.viewport || {};
        
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);
        setViewport({ x, y, zoom });
        alert("Flowchart restored successfully!");
      } catch (error) {
        console.error("Error restoring flowchart:", error);
        alert("Failed to restore flowchart. Data might be corrupted.");
      }
    };
  
    restoreFlow();
  }, [setNodes, setViewport, setEdges]);
  
  useEffect(() => {
    const savedFlow = localStorage.getItem(flowKey);
    if (savedFlow) {
      const flow = JSON.parse(savedFlow);
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      setViewport(flow.viewport || { x: 0, y: 0, zoom: 1 });
    } else {
     
      setNodes(defaultFlowchart.nodes);
      setEdges(defaultFlowchart.edges);
    }
  }, []);
  const onClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(flowKey);
    alert("Flowchart cleared!");
  }, [setNodes, setEdges]);

useEffect(() => {
  const savedFlow = localStorage.getItem(flowKey);
  if (savedFlow) {
    const flow = JSON.parse(savedFlow);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setViewport(flow.viewport || { x: 0, y: 0, zoom: 1 });
  }
}, []); // Runs once when the component mounts

  const [newEdge, setNewEdge] = useState(null); // Store pending edge
  const [relationship, setRelationship] = useState("depends on"); // Selected relationship
  const [isModalOpen, setIsModalOpen] = useState(false); // Control modal visibility
  const [history, setHistory] = useState([]); // Stack for undo
const [future, setFuture] = useState([]); // Stack for redo


const onConnect = useCallback((params) => {
  saveToHistory();
  setNewEdge(params);  // Store edge temporarily
  setIsModalOpen(true); // Open the relationship selection modal
}, []);

const saveToHistory = () => {
  setHistory((prevHistory) => [
    ...prevHistory,
    { nodes: [...nodes], edges: [...edges] },
  ]);
  setFuture([]); // Clear redo history on new action
};


const exportFlowchart = () => {
  const flowData = {
    steps: [
      {
        id: "step-1",
        name: "Step 1",
        nodes: nodes.map((node) => ({
          id: node.id,
          label: node.data.label,
          position: node.position,
        })),
      },
    ],
    edges: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      relationship: edge.label || "default",
    })),
  };

  const jsonString = JSON.stringify(flowData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "flowchart.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


const importFlowchart = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const flowData = JSON.parse(e.target.result);

      const loadedNodes = (flowData.steps || []).flatMap((step) =>
        (step.nodes || []).map((node) => ({
          id: node.id,
          data: { label: node.label },
          position: node.position || { x: 0, y: 0 },
        }))
      );

      const loadedEdges = (flowData.edges || []).map((edge) => ({
        source: edge.source,
        target: edge.target,
        animated: true,
        label: edge.relationship || "default",
      }));

      setNodes(loadedNodes);
      setEdges(loadedEdges);
    } catch (error) {
      alert("Invalid JSON file.");
      console.error("Error parsing JSON:", error);
    }
  };

  reader.readAsText(file);
};


  return (

    <div style={{ width: "100vw", height: "100vh" }}>
    <ReactFlow
      ref={ref}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onInit={setReactFlowInstance}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onEdgeUpdate={onEdgeUpdate}
      onEdgeUpdateStart={onEdgeUpdateStart}
      onEdgeUpdateEnd={onEdgeUpdateEnd}
      onPaneClick={onPaneClick}
      onNodeContextMenu={onNodeContextMenu}
    >
      
      

      {/* sidebar */}
     <div className={`transition-all duration-500 fixed top-0 ${isSidebarOpen ? "left-0" : "-left-64"}`}> 
  <div className="relative flex flex-col w-64 h-screen min-h-screen px-4 py-8 overflow-y-auto bg-white border-r shadow-md"> 
    <button onClick={closeSidebar} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"> 
      <BiSolidDockLeft className="w-5 h-5" /> 
    </button> 
    
    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Actions</h2> 
    
    {/* Undo/Redo Section */} 
    <div className="mb-4"> 
      <h3 className="text-lg font-bold">Edit</h3> 
      <div className="flex space-x-2 mt-2"> 
        <button className="px-3 py-1 bg-gray-700 text-white text-sm rounded shadow hover:bg-gray-800" onClick={undo}>⮌ Undo</button> 
        <button className="px-3 py-1 bg-gray-700 text-white text-sm rounded shadow hover:bg-gray-800" onClick={redo}>⮊ Redo</button> 
      </div> 
    </div> 
    
    {/* Create Node Section */} 
    <div className="mb-4"> 
      <h3 className="text-lg font-bold">Create Node</h3> 
      <input type="text" placeholder="Name" className="p-2 border w-full rounded mt-2" onChange={(e) => setNewNodeInput((prev) => ({ ...prev, name: e.target.value }))} value={newNodeInput.name} /> 
      <button className="w-full p-2 mt-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleCreateNode}>Create</button> 
    </div> 
    
    {/* Upload JSON Section */} 
    <div className="mb-4"> 
      <h3 className="text-lg font-bold">Upload JSON</h3> 
      <label className="block w-full p-2 bg-purple-600 text-white rounded text-center hover:bg-purple-700 cursor-pointer mt-2">⬆ Import 
        <input type="file" accept=".json" onChange={importFlowchart} className="hidden" /> 
      </label> 
    </div> 
    
    {/* Update Node Section */} 
    <div className="mb-4"> 
      <h3 className="text-lg font-bold">Update Node</h3> 
      <input type="text" name="name" placeholder="Name" value={nodeName} onChange={handleUpdateNode} className="p-2 border w-full rounded mt-2" /> 
    </div> 
    
    {/* Save/Restore Section */} 
    <div className="mb-4"> 
      <h3 className="text-lg font-bold">Save & Restore</h3> 
      <div className="flex space-x-2 mt-2"> 
        <button className="flex-1 p-2 bg-slate-700 text-white rounded hover:bg-slate-800" onClick={onSave}>Save</button> 
        <button className="flex-1 p-2 bg-slate-700 text-white rounded hover:bg-slate-800" onClick={onRestore}>Restore</button> 
      </div> 
    </div> 
    
    {/* Export/Download Section */} 
    <div className="mb-4"> 
      <h3 className="text-lg font-bold">Export & Download</h3> 
      <div className="flex space-x-2 mt-2"> 
        <button className="flex-1 p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700" onClick={exportFlowchart}>⬇ Export</button> 
        <button className="flex-1 p-2 bg-slate-700 text-white rounded hover:bg-slate-800" onClick={onClick}>Download</button> 
      </div>
      <div className="mb-4">
              <h3 className="text-lg font-bold">Clear Flowchart</h3>
              <button className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={onClear}>Clear Screen</button>
            </div> 
    </div> 
  </div> 
</div>

    

      <Controls />
      <MiniMap zoomable pannable />
      <Background variant="dots" gap={12} size={1} />
      {/* context menu */}
      {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
    </ReactFlow>
    {/* Modal should be OUTSIDE ReactFlow */}
    {isModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center">
          <h2 className="text-lg font-bold mb-4">Select Relationship Type</h2>

          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="depends on">Depends On</option>
            <option value="related to">Related To</option>
            <option value="leads to">Leads To</option>
            <option value="proceeds to">Proceeds To</option>
          </select>

          <div className="flex justify-center mt-4 space-x-3">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => {
                setEdges((prevEdges) => [
                  ...prevEdges,
                  {
                    id: `${newEdge.source}-${newEdge.target}`,
                    source: newEdge.source,
                    target: newEdge.target,
                    animated: true,
                    label: relationship, // Store selected relationship label
                  },
                ]);
                setIsModalOpen(false); // Close the modal
                setNewEdge(null); // Reset new edge
              }}
            >
              Confirm
            </button>

            <button
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              onClick={() => {
                setIsModalOpen(false); // Close the modal without adding the edge
                setNewEdge(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
};

const ReactFlowProviderContent = () => {
  const { isSidebarOpen } = useGlobalContext();
  return (
    <ReactFlowProvider>
      <div
        className={`h-[calc(100vh-74px)] flex flex-col  ${
          isSidebarOpen ? "ml-64" : ""
        }`}
      >
        <Content />
      </div>
    </ReactFlowProvider>
  );
};
export default ReactFlowProviderContent;
