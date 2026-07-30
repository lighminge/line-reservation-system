const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminMessages.jsx', 'utf8');

const s1 = content.indexOf('{/* Reminder Day Before */}');
const s2 = content.indexOf('{/* Reminder Three Days Before */}');
const s3 = content.indexOf('{/* Reminder Two Days Before */}');
const s4 = content.indexOf('{/* Reminder Same Day */}');
const sEnd = content.indexOf('</div>', s4 + 100); // the end of Reminder Same Day block. Actually let's find the exact end.

// Since we know the order is currently Day, Three, Two, Same:
const bDay = content.substring(s1, s2);
const bThree = content.substring(s2, s3);
const bTwo = content.substring(s3, s4);

// To find where Same Day ends, it ends right before `</>` which closes the `(viewCategory === 'ALL' || viewCategory === 'REMINDER') && (<> ... </>)`
const endOfReminders = content.indexOf('</>', s4);
const bSame = content.substring(s4, endOfReminders);

const pre = content.substring(0, s1);
const post = content.substring(endOfReminders);

const newContent = pre + bThree + bTwo + bDay + bSame + post;

fs.writeFileSync('src/pages/admin/AdminMessages.jsx', newContent);
