// shared/aggregate.js
// Works in Node (require), browser (<script>), and Apps Script (global).
var _period = (typeof require !== "undefined") ? require("./period") : { currentCycle: currentCycle, inCycle: inCycle };

function buildDashboardModel(txns, budgets, settings) {
  txns = txns || []; budgets = budgets || [];
  var cycle = _period.currentCycle(settings.asOf, settings.cycleStartDay);
  var inCyc = txns.filter(function (t) { return _period.inCycle(t.date, cycle); });

  // KPIs
  var balanceIn = 0, balanceOut = 0;
  inCyc.forEach(function (t) {
    if (t.direction === "in") balanceIn += t.amount; else balanceOut += t.amount;
  });

  // Spend per expense line item (key = group||lineItem)
  var spentByLine = {};
  inCyc.forEach(function (t) {
    if (t.direction !== "out") return;
    var key = t.group + "||" + t.lineItem;
    spentByLine[key] = (spentByLine[key] || 0) + t.amount;
  });

  // Received per income line item
  var receivedByLine = {};
  inCyc.forEach(function (t) {
    if (t.direction !== "in") return;
    var key = t.group + "||" + t.lineItem;
    receivedByLine[key] = (receivedByLine[key] || 0) + t.amount;
  });

  var income = [];
  var budgetVsActual = [];
  var groupMap = {};
  var incomeBudget = 0, expenseBudget = 0, spentToDate = 0, overToDate = 0;

  budgets.forEach(function (b) {
    var key = b.group + "||" + b.lineItem;
    if (b.kind === "income") {
      incomeBudget += b.budget;
      var received = receivedByLine[key] || 0;
      income.push({ lineItem: b.lineItem, budget: b.budget, received: received,
        outstanding: Math.max(0, b.budget - received) });
      return;
    }
    expenseBudget += b.budget;
    var spent = spentByLine[key] || 0;
    var over = Math.max(0, spent - b.budget);
    spentToDate += spent;
    overToDate += over;
    budgetVsActual.push({ group: b.group, lineItem: b.lineItem, budget: b.budget,
      spent: spent, remaining: b.budget - spent, over: over });

    if (!groupMap[b.group]) groupMap[b.group] = { group: b.group, budget: 0, spent: 0, remaining: 0, over: 0 };
    groupMap[b.group].budget += b.budget;
    groupMap[b.group].spent += spent;
    groupMap[b.group].remaining += (b.budget - spent);
    groupMap[b.group].over += over;
  });

  var groupSubtotals = Object.keys(groupMap).map(function (g) { return groupMap[g]; });

  // byCategory: expense lines with spend, pct of total spent
  var byCategory = budgetVsActual
    .filter(function (r) { return r.spent > 0; })
    .map(function (r) {
      return { group: r.group, lineItem: r.lineItem, spent: r.spent,
        pct: spentToDate > 0 ? (r.spent / spentToDate) * 100 : 0 };
    });

  // top merchants by spend
  var byMerchant = {};
  inCyc.forEach(function (t) {
    if (t.direction !== "out") return;
    byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount;
  });
  var topMerchants = Object.keys(byMerchant)
    .map(function (k) { return { merchant: k, total: byMerchant[k] }; })
    .sort(function (a, b) { return b.total - a.total; })
    .slice(0, 5);

  var plannedSurplus = incomeBudget - expenseBudget;

  return {
    cycle: cycle,
    kpis: { balanceIn: balanceIn, balanceOut: balanceOut, net: balanceIn - balanceOut },
    income: income,
    byCategory: byCategory,
    budgetVsActual: budgetVsActual,
    groupSubtotals: groupSubtotals,
    outcome: {
      incomeBudget: incomeBudget, expenseBudget: expenseBudget,
      plannedSurplus: plannedSurplus, spentToDate: spentToDate,
      overToDate: overToDate, projectedSurplus: plannedSurplus - overToDate
    },
    topMerchants: topMerchants
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildDashboardModel };
}
