/**
 * Finance.gs — monthly (1st of every month) and, piggybacking on the
 * same run, quarterly BTW overview (after Mar/Jun/Sep/Dec close) from
 * the Income and Expenses tabs. Emailed to the owner.
 *
 * IMPORTANT: this is a draft/prep overview, not a certified bookkeeping
 * or filing tool. The BTW rate per line (btw_rate_pct) is filled in by
 * hand in the Sheet — nothing here assumes, defaults, or hardcodes a
 * specific rate, because Dutch BTW rates for catering/horeca are
 * genuinely rate- and situation-dependent (food vs. alcohol vs.
 * service, and the rules changed as recently as Jan 2026). Verify the
 * actual rate for each line yourself (belastingdienst.nl or your own
 * check) before relying on this for an actual BTW-aangifte.
 */

function getAllIncomeRecords(){ return getAllRecords('Income'); }
function getAllExpenseRecords(){ return getAllRecords('Expenses'); }

/* Sums amount_excl_btw and (where a rate is filled in) the BTW over a
   date range. Rows with no date, or a btw_rate_pct that isn't a
   number, still count toward the turnover/cost total but are flagged
   separately rather than silently treated as 0%. */
function summarizeFinanceRange(records, startDate, endDate){
  var totalExclBtw = 0;
  var totalBtw = 0;
  var missingRate = 0;
  var count = 0;

  records.forEach(function(r){
    var d = toDateOnly(r.date);
    if (!d || d < startDate || d > endDate) return;
    count++;

    var amount = Number(r.amount_excl_btw) || 0;
    totalExclBtw += amount;

    var ratePct = Number(r.btw_rate_pct);
    if (r.btw_rate_pct === '' || r.btw_rate_pct === null || isNaN(ratePct)){
      missingRate++;
      return;
    }
    totalBtw += amount * (ratePct / 100);
  });

  return { count: count, totalExclBtw: totalExclBtw, totalBtw: totalBtw, missingRate: missingRate };
}

function formatEuro(n){
  return '€ ' + n.toFixed(2);
}

function buildFinanceSection(title, income, expenses){
  var lines = [];
  if (title) lines.push(title, '');

  lines.push('Omzet (excl. BTW): ' + formatEuro(income.totalExclBtw) + ' (' + income.count + ' regel(s))');
  lines.push('BTW ontvangen: ' + formatEuro(income.totalBtw));
  if (income.missingRate > 0){
    lines.push('⚠ ' + income.missingRate + ' omzetregel(s) zonder btw_rate_pct — niet meegeteld in "BTW ontvangen".');
  }
  lines.push('');
  lines.push('Kosten (excl. BTW): ' + formatEuro(expenses.totalExclBtw) + ' (' + expenses.count + ' regel(s))');
  lines.push('BTW betaald (voorbelasting): ' + formatEuro(expenses.totalBtw));
  if (expenses.missingRate > 0){
    lines.push('⚠ ' + expenses.missingRate + ' kostenregel(s) zonder btw_rate_pct — niet meegeteld in "BTW betaald".');
  }
  lines.push('');

  var netResult = income.totalExclBtw - expenses.totalExclBtw;
  var btwPayable = income.totalBtw - expenses.totalBtw;
  lines.push('Resultaat (omzet − kosten, excl. BTW): ' + formatEuro(netResult));
  lines.push('Te betalen / terug te vragen BTW: ' + formatEuro(btwPayable) +
    (btwPayable >= 0 ? ' (te betalen)' : ' (terug te vragen)'));

  return lines;
}

function sendFinanceReport(){
  var tz = 'Europe/Amsterdam';
  var now = new Date();
  var thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var prevMonthEnd = new Date(thisMonthStart.getTime() - 1);
  var prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);

  var income = getAllIncomeRecords();
  var expenses = getAllExpenseRecords();

  var monthlyIncome = summarizeFinanceRange(income, prevMonthStart, prevMonthEnd);
  var monthlyExpenses = summarizeFinanceRange(expenses, prevMonthStart, prevMonthEnd);

  var lines = buildFinanceSection(
    'Maandoverzicht — ' + Utilities.formatDate(prevMonthStart, tz, 'MMMM yyyy'),
    monthlyIncome, monthlyExpenses
  );

  /* The previous month was the last month of a BTW-quarter (Mar/Jun/Sep/Dec)
     -> also append a quarterly section covering that full quarter. */
  var prevMonthNum = prevMonthEnd.getMonth(); // 0-based
  var isQuarterClose = prevMonthNum === 2 || prevMonthNum === 5 || prevMonthNum === 8 || prevMonthNum === 11;
  if (isQuarterClose){
    var quarterStart = new Date(prevMonthEnd.getFullYear(), prevMonthNum - 2, 1);
    var quarterEnd = prevMonthEnd;
    var qIncome = summarizeFinanceRange(income, quarterStart, quarterEnd);
    var qExpenses = summarizeFinanceRange(expenses, quarterStart, quarterEnd);
    var quarterLabel = 'Q' + Math.floor((prevMonthNum - 2) / 3 + 1) + ' ' + quarterStart.getFullYear();

    lines = lines.concat(['', '— BTW-kwartaaloverzicht (' + quarterLabel + ') —', '']);
    lines = lines.concat(buildFinanceSection(null, qIncome, qExpenses));
  }

  lines.push('');
  lines.push('⚠ Dit is een concept-overzicht op basis van de Income/Expenses-tabbladen in de Sheet — geen officiële aangifte. ' +
    'Controleer zelf (of met een boekhouder) of elk BTW-tarief klopt voordat je hiermee de BTW-aangifte doet. ' +
    'Open de Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());

  var ownerEmail = getSetting('owner_email', '');
  if (!ownerEmail) return;

  var subject = '[ForkIt] Financieel overzicht — ' + Utilities.formatDate(prevMonthStart, tz, 'MMMM yyyy') +
    (isQuarterClose ? ' + BTW-kwartaal' : '');
  MailApp.sendEmail(ownerEmail, subject, lines.join('\n'));
}

function job_financeReport(){ runJob('financeReport', sendFinanceReport); }
