import * as cheerio from 'cheerio';
import Color from 'colorjs.io';

export function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $.text();
}

function anyColorToHex(colorStr) {
  try {
    const color = new Color(colorStr);
    let hex = color.to('srgb').toString({format: 'hex'});
    if (hex.length === 4) {
      hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    // Also remove alpha channel if colorjs.io outputs #RRGGBBAA since Line only supports 6 digits
    if (hex.length === 9) {
      hex = hex.substring(0, 7);
    }
    return hex;
  } catch (err) {
    return null;
  }
}

export function parseHtmlToFlexContents(htmlString, defaultColor = "#333333", defaultSize = "md", defaultWeight = "regular") {
  if (!htmlString || !htmlString.includes('<')) {
    // Plain text fallback
    return [{
      type: "text",
      text: htmlString || " ",
      wrap: true,
      size: defaultSize,
      weight: defaultWeight,
      color: defaultColor
    }];
  }

  const $ = cheerio.load(htmlString);
  const contents = [];

  $('body').children().each((_, elem) => {
    // Each child of body is usually a <p> or heading from Quill
    const $block = $(elem);
    let align = 'start';
    if ($block.hasClass('ql-align-center')) align = 'center';
    else if ($block.hasClass('ql-align-right')) align = 'end';
    else if ($block.hasClass('ql-align-justify')) align = 'start'; // justify not supported, fallback to start

    // If block is empty (e.g. <p><br></p>)
    if ($block.text().trim() === '' && $block.find('br').length > 0) {
      contents.push({
        type: "text",
        text: " ",
        size: "sm",
        wrap: true
      });
      return;
    }

    const spans = [];
    
    // recursive function to parse inline elements
    function parseNode(node, currentStyles) {
      if (node.type === 'text') {
        if (node.data) {
          spans.push({
            type: "span",
            text: node.data,
            size: currentStyles.size || defaultSize,
            weight: currentStyles.weight || defaultWeight,
            color: currentStyles.color || defaultColor
          });
        }
      } else if (node.type === 'tag') {
        if (node.name === 'br') {
          spans.push({
            type: "span",
            text: "\n",
            size: currentStyles.size || defaultSize,
            weight: currentStyles.weight || defaultWeight,
            color: currentStyles.color || defaultColor
          });
          return;
        }

        const newStyles = { ...currentStyles };
        const $n = $(node);

        if (node.name === 'strong' || node.name === 'b') {
          newStyles.weight = 'bold';
        }
        
        // Quill uses classes for size
        if ($n.hasClass('ql-size-small')) newStyles.size = 'sm';
        else if ($n.hasClass('ql-size-large')) newStyles.size = 'xl';
        else if ($n.hasClass('ql-size-huge')) newStyles.size = '3xl';
        
        // Color is inline style
        const styleAttr = $n.attr('style') || '';
        
        const colorMatch = styleAttr.match(/color:\s*([^;]+)/i);
        if (colorMatch) {
          const colorVal = colorMatch[1].trim();
          const hex = anyColorToHex(colorVal);
          if (hex) newStyles.color = hex;
        }

        const sizeMatch = styleAttr.match(/font-size:\s*([^;]+)/i);
        if (sizeMatch) {
          const sizeVal = sizeMatch[1].trim();
          if (sizeVal.includes('px')) {
            const px = parseInt(sizeVal);
            if (px <= 12) newStyles.size = 'sm';
            else if (px <= 16) newStyles.size = 'md';
            else if (px <= 20) newStyles.size = 'lg';
            else if (px <= 24) newStyles.size = 'xl';
            else if (px <= 28) newStyles.size = 'xxl';
            else if (px <= 32) newStyles.size = '3xl';
            else if (px <= 36) newStyles.size = '4xl';
            else newStyles.size = '5xl';
          } else if (sizeVal.includes('rem') || sizeVal.includes('em')) {
            const em = parseFloat(sizeVal);
            if (em <= 0.8) newStyles.size = 'sm';
            else if (em <= 1.0) newStyles.size = 'md';
            else if (em <= 1.25) newStyles.size = 'lg';
            else if (em <= 1.5) newStyles.size = 'xl';
            else if (em <= 1.75) newStyles.size = 'xxl';
            else if (em <= 2.0) newStyles.size = '3xl';
            else if (em <= 2.25) newStyles.size = '4xl';
            else newStyles.size = '5xl';
          }
        }

        $(node).contents().each((_, child) => {
          parseNode(child, newStyles);
        });
      }
    }

    $block.contents().each((_, child) => {
      parseNode(child, {});
    });

    if (spans.length > 0) {
      contents.push({
        type: "text",
        contents: spans,
        align: align,
        wrap: true
      });
    }
  });

  return contents.length > 0 ? contents : [{
    type: "text",
    text: " ",
    wrap: true
  }];
}
