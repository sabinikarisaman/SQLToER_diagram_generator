import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Dynamic Layout Configuration ---
const PADDING = 80;
const BASE_ENTITY = { width: 140, height: 50 };
const ATTRIBUTE = { rx: 75, ry: 25 };
const RELATIONSHIP = { width: 130, height: 50 };
const FONT_FAMILY = "Segoe UI, Arial";

// Calculate dynamic spacing based on content
const calculateDynamicSpacing = (er) => {
  let maxAttrs = 0;
  let maxRelations = 0;
  
  // Find max attributes per entity
  er.entities.forEach(entity => {
    const attrs = er.attributes.filter(a => a.entity === entity.name).length;
    if (attrs > maxAttrs) maxAttrs = attrs;
  });
  
  maxRelations = er.relationships?.length || 0;
  
  return {
    hSpacing: 180 + Math.min(maxAttrs, 5) * 30,
    vSpacing: 250 + Math.min(maxAttrs, 3) * 60,
    relSpacing: 120 + maxRelations * 40
  };
};

// Normalize attribute to string
const normalizeAttribute = (attr) => {
  if (typeof attr === 'string') return attr;
  if (attr.attribute) return attr.attribute;
  if (attr.name) return attr.name;
  return JSON.stringify(attr);
};

// Layout calculation function
const calculateLayout = (er) => {
  console.log("My Layout Algorithm: Calculating optimal element positions");
  
  if (!er || !er.entities || er.entities.length === 0) return null;

  const nodes = {};
  const links = [];
  const spacing = calculateDynamicSpacing(er);
  const entitiesPerRow = Math.min(er.entities.length, 3);

  console.log("Layout parameters:", {
    entities: er.entities.length,
    entitiesPerRow: entitiesPerRow,
    horizontalSpacing: spacing.hSpacing,
    verticalSpacing: spacing.vSpacing
  });

  // Filter out duplicate attributes
  const uniqueAttributes = new Set();
  const filteredAttributes = (er.attributes || []).filter(attr => {
    const entity = attr.entity;
    const attrName = normalizeAttribute(attr.attribute);
    const key = `${entity}-${attrName}`;
    
    if (uniqueAttributes.has(key)) return false;
    uniqueAttributes.add(key);
    return true;
  });

  console.log("My Algorithm: Placing entities in optimized grid layout");

  // 1. Initial Grid Placement for Entities
  er.entities.forEach((entity, i) => {
    nodes[entity.name] = {
      ...entity, id: entity.name, type: 'entity',
      x: PADDING + (i % entitiesPerRow) * (BASE_ENTITY.width + spacing.hSpacing),
      y: PADDING + Math.floor(i / entitiesPerRow) * spacing.vSpacing,
    };
  });
  
  console.log("My Algorithm: Positioning attributes relative to entities");

  // 2. Place Attributes to the right of entities
  Object.values(nodes).filter(n => n.type === 'entity').forEach(entityNode => {
      const entityAttrs = filteredAttributes.filter(a => a.entity === entityNode.name);
      const attrColumnHeight = entityAttrs.length * (ATTRIBUTE.ry * 2 + 20);
      const startY = entityNode.y - attrColumnHeight / 2 + ATTRIBUTE.ry;
      
      entityAttrs.forEach((attr, i) => {
          const attrName = normalizeAttribute(attr.attribute);
          const id = `${entityNode.id}-${attrName}`;
          const isPK = attrName.startsWith('PK_');
          const isMV = attrName.startsWith('MV_');
          const isDerived = attrName.startsWith('DA_');
          const cleanAttribute = attrName.replace(/^(PK_|MV_|DA_)/, '');
          
          nodes[id] = {
              ...attr, id, type: 'attribute', attribute: cleanAttribute, 
              isPK, isMV, isDerived,
              x: entityNode.x + BASE_ENTITY.width/2 + ATTRIBUTE.rx + 20,
              y: startY + i * (ATTRIBUTE.ry * 2 + 20)
          };
          links.push({ source: id, target: entityNode.id });

          // Handle composite attributes
          if (attr.components) {
              nodes[id].isComposite = true;
              attr.components.forEach((comp, j) => {
                  const compId = `${id}-${comp}`;
                  nodes[compId] = {
                      id: compId, type: 'attribute', attribute: comp,
                      x: nodes[id].x + (j - (attr.components.length-1)/2) * (ATTRIBUTE.rx * 1.5),
                      y: nodes[id].y - ATTRIBUTE.ry - 40
                  };
                  links.push({source: compId, target: id})
              })
          }
      });
  });

  console.log("My Algorithm: Calculating relationship positions with staggering");

  // 3. Place Relationships with vertical staggering
  (er.relationships || []).forEach((rel, i) => {
    const fromEntity = nodes[rel.from];
    const toEntity = nodes[rel.to];
    if (!fromEntity || !toEntity) return;

    const id = `${rel.label}-${i}`;
    nodes[id] = { 
      ...rel, id, type: 'relationship', 
      x: (fromEntity.x + toEntity.x) / 2, 
      y: Math.max(fromEntity.y, toEntity.y) + spacing.relSpacing + (i * 60),
    };
    
    links.push({ source: id, target: rel.from });
    links.push({ source: id, target: rel.to });

    // Relationship attributes
    (rel.attributes || []).forEach((attr, j) => {
      const attrName = normalizeAttribute(attr);
      const attrId = `${id}-${attrName}`;
      nodes[attrId] = { 
        id: attrId, 
        label: attrName, 
        type: 'rel-attribute', 
        x: nodes[id].x, 
        y: nodes[id].y + RELATIONSHIP.height / 2 + ATTRIBUTE.ry + 20 + (j * 60) 
      };
      links.push({ source: attrId, target: id, isDashed: true });
    });
  });

  console.log("My Algorithm: Calculating final viewport dimensions");

  // 4. Calculate final viewBox
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  Object.values(nodes).forEach(node => {
    const width = node.type === 'entity' ? BASE_ENTITY.width : 
                 node.type === 'relationship' ? RELATIONSHIP.width : 
                 ATTRIBUTE.rx * 2;
                 
    const height = node.type === 'entity' ? BASE_ENTITY.height : 
                  node.type === 'relationship' ? RELATIONSHIP.height : 
                  ATTRIBUTE.ry * 2;
                  
    minX = Math.min(minX, node.x - width / 2);
    minY = Math.min(minY, node.y - height / 2);
    maxX = Math.max(maxX, node.x + width / 2);
    maxY = Math.max(maxY, node.y + height / 2);
  });

  const viewBox = `${minX - PADDING} ${minY - PADDING} ${maxX - minX + PADDING * 2} ${maxY - minY + PADDING * 2}`;
  
  console.log("My Layout Algorithm completed. Results:", {
    totalNodes: Object.values(nodes).length,
    totalLinks: links.length,
    viewBox: viewBox,
    bounds: { minX, minY, maxX, maxY }
  });
  
  return { nodes: Object.values(nodes), links, viewBox, cardinalities: er.cardinalities || [] };
};

export default function ERCanvas({ er, svgRef }) {
  const [layout, setLayout] = useState(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const erRef = useRef(er);
  
  // Calculate initial layout and handle reset events
  useEffect(() => {
    erRef.current = er;
    
    const handleReset = (e) => {
      console.log("User interaction: Layout reset - My algorithm recalculating");
      if (e.detail && erRef.current) {
        try {
          setLayout(calculateLayout(erRef.current));
        } catch (error) {
          console.error("Error in layout reset:", error);
        }
      }
    };

    window.addEventListener('resetDiagram', handleReset);
    
    try {
      if (er && er.entities && er.entities.length > 0) {
        console.log("=== MY DIAGRAM RENDERING ENGINE INITIALIZED ===");
        console.log("STEP 5: Processing JSON data with my layout algorithm");
        console.log("Input to my rendering system:", {
          entities: er.entities.length,
          attributes: er.attributes?.length || 0,
          relationships: er.relationships?.length || 0
        });
        
        const startTime = performance.now();
        const calculatedLayout = calculateLayout(er);
        const endTime = performance.now();
        
        console.log("STEP 6: My layout calculation completed in " + (endTime - startTime).toFixed(2) + "ms");
        console.log("Layout output ready for SVG rendering:", {
          nodes: calculatedLayout.nodes.length,
          links: calculatedLayout.links.length,
          viewBox: calculatedLayout.viewBox
        });
        
        console.log("STEP 7: My SVG rendering engine drawing visual elements");
        setLayout(calculatedLayout);
        
        console.log("=== VISUAL DIAGRAM RENDERING COMPLETED - ALL MY WORK ===");
      } else {
        setLayout(null);
      }
    } catch (error) {
      console.error("Error in my layout algorithm:", error);
      setLayout(null);
    }
    
    return () => window.removeEventListener('resetDiagram', handleReset);
  }, [er]);

  // Handle dragging functionality
  const handleMouseDown = useCallback((nodeId, e) => {
    e.preventDefault();
    if (!layout) return;
    
    const node = layout.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    console.log("User interaction: Drag started on node - My interaction system handling");
    
    // Calculate drag offset
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: svgPoint.x - node.x,
      y: svgPoint.y - node.y
    });
  }, [layout, svgRef]);

  const handleMouseMove = useCallback((e) => {
    if (!draggingNodeId) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    setLayout(prev => {
      const newNodes = prev.nodes.map(node => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            x: svgPoint.x - dragOffset.x,
            y: svgPoint.y - dragOffset.y
          };
        }
        return node;
      });
      
      return { ...prev, nodes: newNodes };
    });
  }, [draggingNodeId, dragOffset, svgRef]);

  const handleMouseUp = useCallback(() => {
    if (draggingNodeId) {
      console.log("User interaction: Drag completed - My system updated layout");
    }
    setDraggingNodeId(null);
  }, [draggingNodeId]);

  if (!layout) return null;
  
  try {
    const { nodes, links, viewBox, cardinalities } = layout;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    console.log("My SVG Engine: Rendering " + nodes.length + " elements to canvas");

    return (
      <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
        <svg 
          ref={svgRef} 
          width="100%" 
          viewBox={viewBox} 
          style={{ border: '1px solid #aaa', background: '#fff', fontFamily: FONT_FAMILY }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* SECTION 1: LINES */}
          {links.map((link, i) => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);
            if (!source || !target) return null;
            return <line key={`link-${i}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#333" strokeDasharray={link.isDashed ? '4,4' : 'none'} />;
          })}

          {/* SECTION 2: SHAPES & TEXT */}
          {nodes.map((node, i) => {
            const key = `node-${i}-${node.id}`;
            const isDragging = draggingNodeId === node.id;
            const cursorStyle = isDragging ? 'grabbing' : 'grab';
            
            switch (node.type) {
              case 'entity':
                return (
                  <g 
                    key={key}
                    onMouseDown={(e) => handleMouseDown(node.id, e)}
                    style={{ cursor: cursorStyle }}
                  >
                    <rect 
                      x={node.x - BASE_ENTITY.width/2} 
                      y={node.y - BASE_ENTITY.height/2} 
                      width={BASE_ENTITY.width} 
                      height={BASE_ENTITY.height} 
                      stroke="#222" 
                      fill="#f8f8ff" 
                      strokeWidth={node.isWeak ? 2 : 1} 
                    />
                    <text x={node.x} y={node.y + 5} textAnchor="middle" fontWeight="bold" fontSize="16">
                      {node.name}
                    </text>
                  </g>
                );
              case 'attribute':
              case 'rel-attribute':
                return (
                  <g 
                    key={key}
                    onMouseDown={(e) => handleMouseDown(node.id, e)}
                    style={{ cursor: cursorStyle }}
                  >
                    <ellipse cx={node.x} cy={node.y} rx={ATTRIBUTE.rx} ry={ATTRIBUTE.ry} 
                             fill="#fffbe7" stroke="#333" strokeDasharray={node.isDerived ? '4,4' : 'none'} />
                    {node.isMV && <ellipse cx={node.x} cy={node.y} rx={ATTRIBUTE.rx-5} ry={ATTRIBUTE.ry-5} fill="none" stroke="#333" />}
                    <text 
                      x={node.x} 
                      y={node.y + 5} 
                      textAnchor="middle" 
                      fontSize="14" 
                      style={{ textDecoration: node.isPK ? 'underline' : 'none' }}
                    >
                      {node.attribute || node.label}
                    </text>
                  </g>
                );
              case 'relationship':
                return (
                  <g 
                    key={key}
                    onMouseDown={(e) => handleMouseDown(node.id, e)}
                    style={{ cursor: cursorStyle }}
                  >
                    <polygon 
                      points={`${node.x},${node.y - RELATIONSHIP.height/2} ${node.x + RELATIONSHIP.width/2},${node.y} ${node.x},${node.y + RELATIONSHIP.height/2} ${node.x - RELATIONSHIP.width/2},${node.y}`} 
                      fill="#e6f2ff" stroke="#222" strokeWidth={node.isIdentifying ? 2 : 1} 
                    />
                    <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize="14" fontWeight="500">
                      {node.label}
                    </text>
                  </g>
                );
              default: 
                return null;
            }
          })}

          {/* SECTION 3: CARDINALITY PLACEMENT */}
          {cardinalities.map((card, i) => {
            const fromNode = nodeMap.get(card.from);
            const toNode = nodeMap.get(card.to);
            const relNode = nodes.find(n => n.type === 'relationship' && 
              ((n.from === card.from && n.to === card.to) || 
              (n.from === card.to && n.to === card.from)));
            
            if (!fromNode || !toNode || !relNode) return null;
            
            const [fromCard, toCard] = card.type.split(':');
            
            // Calculate positions at 40% along each line segment
            const fromCardPos = {
              x: fromNode.x + (relNode.x - fromNode.x) * 0.4,
              y: fromNode.y + (relNode.y - fromNode.y) * 0.4
            };
            
            const toCardPos = {
              x: toNode.x + (relNode.x - toNode.x) * 0.4,
              y: toNode.y + (relNode.y - toNode.y) * 0.4
            };
            
            // Create background buffers to prevent overlap
            const bgPadding = 5;
            const bgRadius = 8;
            const textWidth = Math.max(fromCard.length, toCard.length) * 9;
            
            return (
              <g key={`card-${i}`}>
                {/* Background buffer for fromCard */}
                <rect 
                  x={fromCardPos.x - textWidth/2 - bgPadding} 
                  y={fromCardPos.y - 12 - bgPadding} 
                  width={textWidth + bgPadding*2} 
                  height={24 + bgPadding*2} 
                  rx={bgRadius} 
                  fill="white" 
                  stroke="none" 
                />
                {/* Background buffer for toCard */}
                <rect 
                  x={toCardPos.x - textWidth/2 - bgPadding} 
                  y={toCardPos.y - 12 - bgPadding} 
                  width={textWidth + bgPadding*2} 
                  height={24 + bgPadding*2} 
                  rx={bgRadius} 
                  fill="white" 
                  stroke="none" 
                />
                
                {/* Cardinality labels */}
                <text 
                  x={fromCardPos.x} 
                  y={fromCardPos.y} 
                  textAnchor="middle" 
                  fill="#d32f2f" 
                  fontSize="16" 
                  fontWeight="bold"
                  dominantBaseline="middle"
                >
                  {fromCard}
                </text>
                <text 
                  x={toCardPos.x} 
                  y={toCardPos.y} 
                  textAnchor="middle" 
                  fill="#d32f2f" 
                  fontSize="16" 
                  fontWeight="bold"
                  dominantBaseline="middle"
                >
                  {toCard}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  } catch (error) {
    console.error("Error in my SVG rendering:", error);
    return <div style={{ color: 'red', padding: '20px' }}>
      Diagram rendering failed: {error.message}
    </div>;
  }
}