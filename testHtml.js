import { parseHtmlToFlexContents, stripHtml } from './api/utils/htmlToFlex.js';

const htmlString = `
<p class="ql-align-center"><strong class="ql-size-large" style="color: rgb(230, 0, 0);">Hello {好友的顯示名稱}!</strong></p>
<p><br></p>
<p class="ql-align-right"><span style="color: rgb(0, 102, 204);">Welcome to our service.</span></p>
`;

console.log("Stripped:");
console.log(stripHtml(htmlString));

console.log("Flex Contents:");
console.log(JSON.stringify(parseHtmlToFlexContents(htmlString), null, 2));
