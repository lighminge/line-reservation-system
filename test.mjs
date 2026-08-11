import { parseHtmlToFlexContents } from './api/utils/htmlToFlex.js';
console.log(JSON.stringify(parseHtmlToFlexContents('<p><span class="ql-size-small">Small</span><span class="ql-size-huge">Huge</span>Normal</p>', '#ffffff', 'xl', 'bold'), null, 2));
