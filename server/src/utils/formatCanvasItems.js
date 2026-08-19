const FONT_FAMILY_CSS = {
  Arial: 'Arial, Helvetica, sans-serif',
  'Times New Roman': '"Times New Roman", Times, serif',
  Georgia: 'Georgia, serif',
  Verdana: 'Verdana, Geneva, sans-serif',
  'Trebuchet MS': '"Trebuchet MS", Helvetica, sans-serif',
  Tahoma: 'Tahoma, Geneva, sans-serif',
  'Courier New': '"Courier New", Courier, monospace',
  'Comic Sans MS': '"Comic Sans MS", Comic Sans, cursive',
  Impact: 'Impact, Haettenschweiler, sans-serif',
  'Palatino Linotype': '"Palatino Linotype", Palatino, serif',
};

const parseFontFamily = (value) => (FONT_FAMILY_CSS[value] ? value : 'Arial');

const fontFamilyCss = (value) => FONT_FAMILY_CSS[parseFontFamily(value)] || FONT_FAMILY_CSS.Arial;

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

const parseCanvasItems = (source) =>
  (Array.isArray(source) ? source : [])
    .slice(0, 40)
    .map((item, index) => {
      const type = ['image', 'rect', 'line'].includes(item?.type) ? item.type : 'text';
      const align = ['left', 'center', 'right'].includes(item?.align) ? item.align : 'left';
      return {
        id: String(item?.id || `canvas_${index}`),
        type,
        x: clamp(item?.x, 0, 95),
        y: clamp(item?.y, 0, 95),
        width: clamp(item?.width || 20, 0.4, 100),
        height: clamp(item?.height || 8, 0.3, 100),
        zIndex: Number(item?.zIndex) || index + 1,
        text: String(item?.text || ''),
        imageUrl: String(item?.imageUrl || ''),
        fontFamily: parseFontFamily(item?.fontFamily),
        fontSize: Number(item?.fontSize) > 0 ? Number(item.fontSize) : 16,
        bold: toBoolean(item?.bold, false),
        italic: toBoolean(item?.italic, false),
        underline: toBoolean(item?.underline, false),
        color: String(item?.color || '#000000'),
        align,
        fill: String(item?.fill || (type === 'rect' ? '#e2e8f0' : '#000000')),
        stroke: String(item?.stroke || '#000000'),
        strokeWidth: Number(item?.strokeWidth) > 0 ? Number(item.strokeWidth) : 1,
      };
    });

const mapCanvasItemsForTemplate = (items = []) =>
  items.map((item) => ({
    ...item,
    isImage: item.type === 'image' && Boolean(item.imageUrl),
    isRect: item.type === 'rect',
    isLine: item.type === 'line',
    boxStyle: [
      `left:${item.x}%`,
      `top:${item.y}%`,
      `width:${item.width}%`,
      `height:${item.height}%`,
      `z-index:${item.zIndex || 1}`,
    ].join(';'),
    textStyle: [
      `font-family:${fontFamilyCss(item.fontFamily)}`,
      `font-size:${item.fontSize || 16}px`,
      `font-weight:${item.bold ? 700 : 400}`,
      `font-style:${item.italic ? 'italic' : 'normal'}`,
      `text-decoration:${item.underline ? 'underline' : 'none'}`,
      `color:${item.color || '#000'}`,
      `text-align:${item.align || 'left'}`,
    ].join(';'),
    shapeStyle:
      item.type === 'rect'
        ? `background:${item.fill || '#e2e8f0'};border:${item.strokeWidth || 1}px solid ${item.stroke || '#000'};width:100%;height:100%;`
        : `background:${item.stroke || item.fill || '#111'};width:100%;height:100%;`,
  });

const CANVAS_OVERLAY_CSS = `
    .canvas-item {
      position: absolute;
      overflow: hidden;
      box-sizing: border-box;
    }
    .canvas-item img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .canvas-item-text {
      width: 100%;
      height: 100%;
      white-space: pre;
      line-height: 1.05;
      padding: 1px;
      overflow: hidden;
    }
`;

module.exports = {
  parseCanvasItems,
  mapCanvasItemsForTemplate,
  CANVAS_OVERLAY_CSS,
  fontFamilyCss,
  parseFontFamily,
};
