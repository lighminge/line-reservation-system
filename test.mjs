import { parseHtmlToFlexContents } from './api/utils/htmlToFlex.js';
console.log(JSON.stringify(parseHtmlToFlexContents('<p><span style="font-size: 10px;">Small</span><span style="font-size: 32px;">Huge</span>Normal</p>', '#ffffff', 'xl', 'bold'), null, 2));
