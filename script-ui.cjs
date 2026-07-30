const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminMessages.jsx', 'utf8');

// Fix the mess in dayBefore clear button
content = content.replace(/setDayBeforePreview\(''\);\n      setTwoDaysBeforePreview\(''\);\n      setThreeDaysBeforePreview\(''\); setDayBeforeFile\(null\);\n      setTwoDaysBeforeFile\(null\);\n      setThreeDaysBeforeFile\(null\);/g, "setDayBeforePreview(''); setDayBeforeFile(null);");

// Now we need to insert the UI for TwoDaysBefore and ThreeDaysBefore.
// Let's find the end of the Reminder Day Before block.
// It ends around:
//         </div>
//
//         {/* Reminder Same Day */}

const dayBeforeMarkupStart = `        {/* Reminder Day Before */}`;
const sameDayMarkupStart = `        {/* Reminder Same Day */}`;

let startIndex = content.indexOf(dayBeforeMarkupStart);
let endIndex = content.indexOf(sameDayMarkupStart);

let dayBeforeBlock = content.substring(startIndex, endIndex);

// Create TwoDaysBefore Block
let twoDaysBlock = dayBeforeBlock
  .replace(/Reminder Day Before/g, "Reminder Two Days Before")
  .replace(/預約提醒 - 前一日/g, "預約提醒 - 前二日")
  .replace(/reminderDayBefore/g, "reminderTwoDaysBefore")
  .replace(/前一日的預約/g, "前二日的預約")
  .replace(/dayBefore/g, "twoDaysBefore")
  .replace(/dayBeforePreview/g, "twoDaysBeforePreview")
  .replace(/dayBeforeFileRef/g, "twoDaysBeforeFileRef")
  .replace(/setDayBeforePreview/g, "setTwoDaysBeforePreview")
  .replace(/setDayBeforeFile/g, "setTwoDaysBeforeFile")
  .replace(/bg-purple-500/g, "bg-indigo-500")
  .replace(/hover:bg-purple-600/g, "hover:bg-indigo-600")
  .replace(/text-purple-700/g, "text-indigo-700")
  .replace(/hover:border-purple-400/g, "hover:border-indigo-400")
  .replace(/hover:bg-purple-50/g, "hover:bg-indigo-50")
  .replace(/group-hover:text-purple-600/g, "group-hover:text-indigo-600")
  .replace(/group-hover:text-purple-700/g, "group-hover:text-indigo-700");

// Create ThreeDaysBefore Block
let threeDaysBlock = dayBeforeBlock
  .replace(/Reminder Day Before/g, "Reminder Three Days Before")
  .replace(/預約提醒 - 前一日/g, "預約提醒 - 前三日")
  .replace(/reminderDayBefore/g, "reminderThreeDaysBefore")
  .replace(/前一日的預約/g, "前三日的預約")
  .replace(/dayBefore/g, "threeDaysBefore")
  .replace(/dayBeforePreview/g, "threeDaysBeforePreview")
  .replace(/dayBeforeFileRef/g, "threeDaysBeforeFileRef")
  .replace(/setDayBeforePreview/g, "setThreeDaysBeforePreview")
  .replace(/setDayBeforeFile/g, "setThreeDaysBeforeFile")
  .replace(/bg-purple-500/g, "bg-blue-500")
  .replace(/hover:bg-purple-600/g, "hover:bg-blue-600")
  .replace(/text-purple-700/g, "text-blue-700")
  .replace(/hover:border-purple-400/g, "hover:border-blue-400")
  .replace(/hover:bg-purple-50/g, "hover:bg-blue-50")
  .replace(/group-hover:text-purple-600/g, "group-hover:text-blue-600")
  .replace(/group-hover:text-purple-700/g, "group-hover:text-blue-700");

// Insert them
content = content.slice(0, endIndex) + "\n" + threeDaysBlock + "\n" + twoDaysBlock + "\n" + content.slice(endIndex);

fs.writeFileSync('src/pages/admin/AdminMessages.jsx', content);
