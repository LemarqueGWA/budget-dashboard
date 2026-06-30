// dashboard/app.js
var WEB_APP_URL = "https://script.google.com/macros/s/AKfycby7PVMcF0pTqIfgEUYZzbirgeDhlQtM7IGxh8uVUX9sH-G1sxtuoC7LDq76_EWcNL_D/exec";

var fmtR = function (n) {
  var v = Math.round(Number(n) || 0).toLocaleString("en-ZA").replace(/,/g, " ");
  return "R " + v;
};
var pct1 = function (n) { return (Math.round(n * 10) / 10) + "%"; };

function show(el, on) { el.hidden = !on; }

async function load(pw) {
  var url = WEB_APP_URL + "?pw=" + encodeURIComponent(pw);
  var res = await fetch(url);
  var data = await res.json();
  if (data.error) throw new Error(data.error);
  // revive dates
  var txns = data.transactions.map(function (t) {
    return { date: new Date(t.date), amount: t.amount, direction: t.direction,
      merchant: t.merchant, group: t.group, lineItem: t.lineItem, status: t.status };
  });
  var model = buildDashboardModel(txns, data.budgets, {
    cycleStartDay: data.settings.cycleStartDay, asOf: new Date()
  });
  render(model, txns);
}

function render(m, txns) {
  // cycle label
  var fmtD = function (d) { return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }); };
  document.getElementById("cycle-label").textContent =
    "Cycle: " + fmtD(m.cycle.start) + " – " + fmtD(m.cycle.end);

  // KPIs
  document.getElementById("kpis").innerHTML =
    kpi("Money in", m.kpis.balanceIn, "in") +
    kpi("Money out", m.kpis.balanceOut, "out") +
    kpi("Net", m.kpis.net, m.kpis.net >= 0 ? "in" : "out");

  // by category
  document.getElementById("by-category").innerHTML = m.byCategory
    .sort(function (a, b) { return b.spent - a.spent; })
    .map(function (c) {
      return "<div class='row'><span>" + c.lineItem + "</span><span class='r'>" +
        fmtR(c.spent) + " · " + pct1(c.pct) + "</span></div>" +
        "<div class='bar'><span style='width:" + Math.min(100, c.pct) + "%'></span></div>";
    }).join("") || "<div class='pct'>No spend yet this cycle.</div>";

  // budget vs actual
  document.getElementById("budget-actual").innerHTML = m.budgetVsActual
    .filter(function (r) { return r.budget > 0 || r.spent > 0; })
    .map(function (r) {
      var ratio = r.budget > 0 ? (r.spent / r.budget) * 100 : 100;
      var over = r.over > 0;
      return "<div class='row'><span>" + r.lineItem + "</span><span class='r'>" +
        fmtR(r.spent) + " / " + fmtR(r.budget) + "</span></div>" +
        "<div class='pct" + (over ? " over" : "") + "'>" +
        (over ? "over by " + fmtR(r.over) : Math.round(ratio) + "% of budget") + "</div>" +
        "<div class='bar'><span class='" + (over ? "over" : "") + "' style='width:" +
        Math.min(100, ratio) + "%'></span></div>";
    }).join("");

  // outcome
  var o = m.outcome;
  document.getElementById("outcome").innerHTML =
    outRow("Income (budget)", o.incomeBudget) +
    outRow("Expenses (budget)", o.expenseBudget) +
    outRow("Planned surplus", o.plannedSurplus) +
    outRow("Spent to date", o.spentToDate) +
    outRow("Over-budget to date", o.overToDate) +
    outRow("Projected surplus", o.projectedSurplus);

  // transactions (most recent 12)
  document.getElementById("transactions").innerHTML = txns
    .slice().sort(function (a, b) { return b.date - a.date; }).slice(0, 12)
    .map(function (t) {
      var uncat = t.lineItem === "Uncategorised";
      return "<div class='txn'><span>" + t.merchant +
        "<span class='pill" + (uncat ? " uncat" : "") + "'>" + t.lineItem + "</span></span>" +
        "<span class='amt " + t.direction + "'>" + (t.direction === "in" ? "+" : "-") +
        fmtR(t.amount) + "</span></div>";
    }).join("");

  // top merchants
  document.getElementById("top-merchants").innerHTML = m.topMerchants
    .map(function (mm) {
      return "<div class='row'><span>" + mm.merchant + "</span><span class='r'>" + fmtR(mm.total) + "</span></div>";
    }).join("");
}

function kpi(label, value, cls) {
  return "<div class='kpi'><div class='lbl'>" + label + "</div><div class='val " + cls + "'>" + fmtR(value) + "</div></div>";
}
function outRow(label, value) {
  return "<div class='row'><span>" + label + "</span><span class='r'>" + fmtR(value) + "</span></div>";
}

// ---- gate wiring ----
function unlock(pw) {
  load(pw).then(function () {
    sessionStorage.setItem("bt_pw", pw);
    show(document.getElementById("gate"), false);
    show(document.getElementById("app"), true);
  }).catch(function (err) {
    document.getElementById("gate-err").textContent =
      err.message === "unauthorised" ? "Wrong password." : "Could not load data.";
    sessionStorage.removeItem("bt_pw");
  });
}

document.getElementById("enter").addEventListener("click", function () {
  unlock(document.getElementById("pw").value);
});
document.getElementById("pw").addEventListener("keydown", function (e) {
  if (e.key === "Enter") unlock(document.getElementById("pw").value);
});
document.getElementById("refresh").addEventListener("click", function () {
  var pw = sessionStorage.getItem("bt_pw");
  if (pw) load(pw);
});

// auto-unlock if password remembered this session
(function () {
  var pw = sessionStorage.getItem("bt_pw");
  if (pw) unlock(pw);
})();
