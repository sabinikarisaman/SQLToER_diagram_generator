// client/src/utils/exporter.js

function getSvgData(svgElement) {
  console.log("Export System: Converting SVG DOM to data URL");
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add namespaces
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  // Add XML declaration
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
}

export function exportToSvg(svgRef, fileName) {
  console.log("=== MY SVG EXPORT SYSTEM STARTED ===");
  console.log("STEP: Processing diagram for SVG download");
  
  if (!svgRef.current) return;
  const svgUrl = getSvgData(svgRef.current);
  const downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = `${fileName}.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  console.log("SVG export completed - File ready for download");
}

export function exportToPng(svgRef, fileName) {
  console.log("=== MY PNG EXPORT SYSTEM STARTED ===");
  console.log("STEP: Converting SVG diagram to PNG format");

  if (!svgRef.current) return;

  const svgElement = svgRef.current;
  const { width, height } = svgElement.getBBox();

  console.log("My PNG System: Creating canvas with dimensions", { width, height });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const svgData = getSvgData(svgElement);

  const img = new Image();
  img.onload = () => {
    console.log("My PNG System: Drawing SVG onto canvas for PNG conversion");
    ctx.drawImage(img, 0, 0);
    const pngUrl = canvas.toDataURL('image/png');
    
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${fileName}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    console.log("PNG export completed - High-quality image ready for download");
  };
  img.src = svgData;
}