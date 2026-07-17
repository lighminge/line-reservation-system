import * as cheerio from 'cheerio';

export function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $.text();
}

function rgbToHex(rgbStr) {
  if (rgbStr.startsWith('#')) return rgbStr;
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return "#" + match.slice(1, 4).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
  }
  return null;
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
        const colorStyle = $n.css('color');
        if (colorStyle) {
          const hex = rgbToHex(colorStyle);
          if (hex) newStyles.color = hex;
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
