const fs = require('fs');

let content = fs.readFileSync('api/cron-events.js', 'utf8');

// 1. Day Before
content = content.replace(
  `if (todayTimeStr >= reminderSettings.dayBefore.time) {`,
  `const dbTime = reminderSettings.dayBefore.time || '20:00';
            if (todayTimeStr >= dbTime) {`
);

// 2. Same Day
content = content.replace(
  `if (todayTimeStr >= reminderSettings.sameDay.time) {`,
  `const sdTime = reminderSettings.sameDay.time || '09:00';
            if (todayTimeStr >= sdTime) {`
);

// 3. Two Days Before
content = content.replace(
  `if (todayTimeStr >= reminderSettings.twoDaysBefore.time) {`,
  `const tdTime = reminderSettings.twoDaysBefore.time || '20:00';
            if (todayTimeStr >= tdTime) {`
);

// 4. Three Days Before
content = content.replace(
  `if (todayTimeStr >= reminderSettings.threeDaysBefore.time) {`,
  `const thdTime = reminderSettings.threeDaysBefore.time || '20:00';
            if (todayTimeStr >= thdTime) {`
);

fs.writeFileSync('api/cron-events.js', content);
