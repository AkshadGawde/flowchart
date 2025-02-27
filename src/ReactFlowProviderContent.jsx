import React, { useCallback, useState, useEffect, useRef } from "react";
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

const defaultJsonData = {
  steps: [
    {
      id: "step-1",
      name: "Step 1",
      nodes: [
        {
          id: "node-1",
          label: "Start Node",
          subNodes: [
            { id: "subnode-1", label: "Sub Node A", parentId: "node-1" },
            { id: "subnode-2", label: "Sub Node B", parentId: "node-1" }
          ]
        },
        { id: "node-2", label: "Process Node", subNodes: [] }
      ]
    },
    {
      id: "step-2",
      name: "Step 2",
      nodes: [
        {
          id: "node-3",
          label: "Decision Node",
          subNodes: []
        }
      ]
    }
  ],
  edges: [
    { source: "node-1", target: "node-2", relationship: "leads to" },
    { source: "node-2", target: "node-3", relationship: "proceeds to" },
    { source: "subnode-1", target: "node-3", relationship: "optional path" }
  ]
};





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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
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
    setNodeColor(node.style.background);
  }, []);
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => {
      edgeUpdateSuccessful.current = true;
      setEdges((els) => updateEdge(oldEdge, newConnection, els));
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
    const stepSpacing = 300; // Horizontal space between steps
    const nodeSpacing = 150; // Vertical space between nodes
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
  
        node.subNodes.forEach((subNode, subIndex) => {
          const subNodePosition = {
            x: parentPosition.x + 100,
            y: parentPosition.y + (subIndex + 1) * 100,
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
  
  useEffect(() => {
    processJSONData(defaultJsonData);
  }, []);
  
  
  
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

    // Update the corresponding state based on the input name

    if (name === "name") setNodeName(value);
    else if (name === "background") setNodeColor(value.background);

    // Find the selected node and update its data
    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, [name]: value },
              style: {
                ...n.style,
                [name]: value,
              },
            }
          : n
      )
    );
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
  const onSave = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      localStorage.setItem(flowKey, JSON.stringify(flow));
    }
  }, [reactFlowInstance]);

  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      const flow = JSON.parse(localStorage.getItem(flowKey));

      if (flow) {
        const { x = 0, y = 0, zoom = 1 } = flow.viewport;
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);
        setViewport({ x, y, zoom });
      }
    };

    restoreFlow();
  }, [setNodes, setViewport, setEdges]);


  const [newEdge, setNewEdge] = useState(null); // Store pending edge
  const [relationship, setRelationship] = useState("depends on"); // Selected relationship
  const [isModalOpen, setIsModalOpen] = useState(false); // Control modal visibility
  

const onConnect = useCallback((params) => {
  setNewEdge(params);  // Store edge temporarily
  setIsModalOpen(true); // Open the relationship selection modal
}, []);

    

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
      <div
        className={`transition-all  duration-500  fixed top-0 ${
          isSidebarOpen ? "left-0" : "-left-64"
        }`}
      >
        <div className="relative flex flex-col w-64 h-screen min-h-screen px-4 py-8 overflow-y-auto bg-white border-r">
          <div className="">
            <button
              onClick={closeSidebar}
              className="absolute flex items-center justify-center w-8 h-8 ml-6 text-gray-600 rounded-full top-1 right-1 active:bg-gray-300 focus:outline-none hover:bg-gray-200 hover:text-gray-800"
            >
              {/* <HiX className="w-5 h-5" /> */}
              <BiSolidDockLeft className="w-5 h-5" />
            </button>
            {/* <h2 className="text-3xl font-semibold text-gray-700 ">
              Flow <span className="-ml-1 text-pink-500 ">Chart</span>
            </h2> */}
          </div>
          <hr className="my-0 mt-[0.20rem]" />
          <div className="flex flex-col justify-between flex-1 mt-3">
            <div className="flex flex-col justify-start space-y-5 h-[calc(100vh-135px)]">
              {/* Create Node Section */}
              <div className="flex flex-col space-y-3 ">
                <div className="mt-3 text-lg font-bold text-black">
                  Create Node
                </div>
                <div className="flex flex-col space-y-3">
                  <input
                    type="text"
                    placeholder="Name"
                    className="p-[1px] border pl-1 "
                    onChange={(e) =>
                      setNewNodeInput((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    value={newNodeInput.name}
                  />
                  <div className="flex flex-row gap-x-2">
                    <label className="font-semibold ">Color:</label>
                    <input
                      type="color"
                      placeholder="Color"
                      className="p-[1px] border pl-1"
                      onChange={(e) =>
                        setNewNodeInput((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      value={newNodeInput.color}
                    />
                  </div>
                  <button
                    className="p-[4px]  text-white bg-slate-700 hover:bg-slate-800 active:bg-slate-900 rounded"
                    onClick={handleCreateNode}
                  >
                    Create
                  </button>
                </div>
              </div>
              <hr className="my-2" />
              <div className="flex flex-col space-y-3">
  <div className="text-lg font-bold text-black">Upload JSON</div>
  <input
    type="file"
    accept=".json"
    onChange={handleFileUpload}
    className="p-[4px] border"
  />
</div>


 
              {/* Update Node Section */}
              <div className="flex flex-col space-y-3">
                <div className="text-lg font-bold text-black">Update Node</div>
                <div className="flex flex-col space-y-3">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={nodeName}
                    onChange={handleUpdateNode}
                    className="p-[1px] border pl-1 "
                  />
                  <div className="flex flex-row gap-x-5">
                    <div className="flex flex-row gap-x-2">
                      <label className="font-semibold ">Color:</label>
                      <input
                        type="color"
                        placeholder="bgColor"
                        name="background"
                        value={nodeColor}
                        onChange={handleUpdateNode}
                        className="p-[1px] border pl-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <hr className="my-0" />
              {/* Drag and Drop Section */}
              <div className="flex flex-col space-y-3">
                <div className="text-lg font-bold text-black">
                  Drag and Drop
                </div>
                <div className="flex flex-col p-1 space-y-3 rounded outline outline-2">
                  <div
                    className="font-medium text-center rounded cursor-grab"
                    onDragStart={(event) => onDragStart(event, "default")}
                    draggable
                  >
                    Default Node
                  </div>
                </div>
              </div>
              <hr className="my-0" />
              {/* Save and Restore Buttons */}
              <div className="flex flex-col space-y-3">
                <div className="text-lg font-bold text-black">Controls</div>
                <div className="flex flex-row space-x-3">
                  <button
                    className="flex-1 p-2 text-sm text-white transition duration-300 ease-in-out rounded bg-slate-700 hover:bg-slate-800 active:bg-slate-900"
                    onClick={onSave}
                  >
                    Save
                  </button>
                  <button
                    className="flex-1 p-2 text-sm text-white rounded bg-slate-700 hover:bg-slate-800 active:bg-slate-900"
                    onClick={onRestore}
                  >
                    Restore{" "}
                  </button>
                  <button
                    className="flex-1 p-2 text-sm text-white rounded bg-slate-700 hover:bg-slate-800 active:bg-slate-900"
                    onClick={onClick}
                  >
                    Download{" "}
                  </button>
                </div>
              </div>
              <hr className="my-0" />
              {/* <div className="flex justify-center px-4 pb-2 mt-auto -mx-4 bottom-3">
                <h4 className=" text-[12px] font-semibold text-gray-600 ">
                  Made with <FaHeart className="inline-block " /> by{" "}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://www.linkedin.com/in/Akshad-gawde"
                    className="cursor-pointer hover:underline hover:text-blue-500"
                  >
                    Akshad Gawde.
                  </a>
                </h4>
              </div> */}
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
