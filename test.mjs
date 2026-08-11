import { parseHtmlToFlexContents } from './api/utils/htmlToFlex.js';
console.log(JSON.stringify(parseHtmlToFlexContents('<p><span style="color: rgb(230, 0, 0);" class="ql-size-huge"><strong>Title</strong></span></p><p><span style="color: #f00;">Test</span></p>'), null, 2));
