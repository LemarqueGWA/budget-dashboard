// shared/period.js
// Assumes startDay <= 28 (no month-end clamping). Product uses 24.
function currentCycle(date, startDay) {
  var y = date.getFullYear();
  var m = date.getMonth();
  var day = date.getDate();
  // If we're before the start day, the cycle began last month.
  var startMonth = day >= startDay ? m : m - 1;
  var start = new Date(y, startMonth, startDay);
  // End = day before the start day of the following month.
  var end = new Date(start.getFullYear(), start.getMonth() + 1, startDay - 1);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start: start, end: end };
}

function inCycle(date, cycle) {
  return date >= cycle.start && date <= cycle.end;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { currentCycle, inCycle };
}
