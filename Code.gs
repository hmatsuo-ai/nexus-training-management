/**
 * Nexus技術研修 進捗管理スプレッドシート初期化スクリプト。
 *
 * 個人情報や実データは含みません。既存の入力値を消去せず、足りない
 * シート・見出し・数式・入力規則・書式だけを補います。
 */

const NEXUS_CONFIG = Object.freeze({
  spreadsheetLocale: 'ja_JP',
  timeZone: 'Asia/Tokyo',
  maxTrainees: 200,
  nexusUrl: 'https://nexus-web-staging-fi7ss3sfta-an.a.run.app/nexus',
  phases: ['技術研修課題', 'Gate1', 'Gate2', 'Gate3', 'Gate4', 'Gate5'],
  progressStatuses: ['未着手', '進行中', '提出待ち', 'レビュー中', '要修正', '合格', '保留', '完了'],
  historyStatuses: ['未着手', '進行中', '提出済み', 'レビュー中', '要修正', '完了', '保留'],
  judgments: ['未判定', '要修正', '合格'],
  assignmentTypes: ['技術研修＋NEXUS', 'NEXUS案内のみ', '技術研修のみ'],
  verificationStatuses: ['確認済み', '担当要確認'],
});

const COLORS = Object.freeze({
  title: '#1E4772',
  header: '#356FA3',
  tableHeader: '#356854',
  lightGray: '#E8EAED',
  border: '#DADCE0',
  successBg: '#E6F4EA',
  successText: '#137333',
  dangerBg: '#FCE8E6',
  dangerText: '#B3261E',
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Nexus研修管理')
    .addItem('初期設定を適用', 'setupNexusTrainingWorkbook')
    .addItem('残日数・更新日を更新', 'refreshNexusDashboard')
    .addItem('毎日更新トリガーを設定', 'installDailyRefreshTrigger')
    .addToUi();
}

function setupNexusTrainingWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetLocale(NEXUS_CONFIG.spreadsheetLocale);
  ss.setSpreadsheetTimeZone(NEXUS_CONFIG.timeZone);

  setupSummary_(ss);
  setupProgress_(ss);
  setupHistory_(ss);
  setupSettings_(ss);
  setupInteractionSummary_(ss);
  SpreadsheetApp.flush();
  ss.toast('初期設定を適用しました。既存データは保持されています。', 'Nexus研修管理', 5);
}

function refreshNexusDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const summary = requireSheet_(ss, 'サマリー');
  summary.getRange('A2').setValue(
    `更新日: ${Utilities.formatDate(new Date(), NEXUS_CONFIG.timeZone, 'yyyy-MM-dd')}　期限・連絡状況を一覧で確認します。`
  );
  fillRemainingDayFormulas_(requireSheet_(ss, '研修生進捗'));
  SpreadsheetApp.flush();
}

function installDailyRefreshTrigger() {
  const handler = 'refreshNexusDashboard';
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === handler)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(8).create();
  SpreadsheetApp.getActiveSpreadsheet().toast('毎日8時台の更新トリガーを設定しました。', 'Nexus研修管理', 5);
}

function setupSummary_(ss) {
  const sheet = ensureSheet_(ss, 'サマリー', 100, 6);
  setIfBlank_(sheet.getRange('A1'), 'Nexus研修生 進捗サマリー');
  setIfBlank_(sheet.getRange('A2'), `更新日: ${Utilities.formatDate(new Date(), NEXUS_CONFIG.timeZone, 'yyyy-MM-dd')}　期限・連絡状況を一覧で確認します。`);
  writeRowIfBlank_(sheet, 4, ['指標', '件数']);

  const metrics = [
    ['登録研修生', "=COUNTA('研修生進捗'!$A$3:$A$202)"],
    ['進行中', "=COUNTIF('研修生進捗'!$E$3:$E$202,\"進行中\")"],
    ['提出待ち', "=COUNTIF('研修生進捗'!$E$3:$E$202,\"提出待ち\")"],
    ['要修正', "=COUNTIF('研修生進捗'!$E$3:$E$202,\"要修正\")"],
    ['期限超過', "=COUNTIFS('研修生進捗'!$A$3:$A$202,\"<>\",'研修生進捗'!$F$3:$F$202,\"<\"&TODAY(),'研修生進捗'!$E$3:$E$202,\"<>合格\",'研修生進捗'!$E$3:$E$202,\"<>完了\")"],
  ];
  metrics.forEach((row, index) => {
    setIfBlank_(sheet.getRange(5 + index, 1), row[0]);
    const formulaCell = sheet.getRange(5 + index, 2);
    if (!formulaCell.getFormula()) formulaCell.setFormula(row[1]);
  });

  sheet.getRange('A1:F1').mergeAcross().setBackground(COLORS.title).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(15);
  sheet.getRange('A4:B4').setBackground(COLORS.lightGray).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('A4:B9').setBorder(true, true, true, true, true, true, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 100);
}

function setupProgress_(ss) {
  const headers = ['研修生', '担当者', '開始日', '現在フェーズ', '進捗状況', '提出期限', '残日数', '最終連絡日', '次回確認日', 'GitHub URL', 'GAS URL', 'NEXUS URL', '直近判定', '次のアクション', '備考'];
  const sheet = ensureSheet_(ss, '研修生進捗', 300, headers.length);
  setupTitledTable_(sheet, 'Nexus研修生 進捗一覧', headers, 2);
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(2);
  setDateFormat_(sheet, [3, 6, 8, 9], 3, NEXUS_CONFIG.maxTrainees);
  setListValidation_(sheet, 4, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.phases);
  setListValidation_(sheet, 5, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.progressStatuses);
  setListValidation_(sheet, 13, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.judgments);
  fillRemainingDayFormulas_(sheet);
  applyProgressConditionalFormatting_(sheet);
  setWidths_(sheet, [120, 110, 105, 120, 110, 105, 85, 105, 105, 240, 240, 260, 105, 260, 320]);
}

function setupHistory_(ss) {
  const headers = ['研修生', 'フェーズ', '状態', '提出期限', '実提出日', 'レビュー日', '判定', 'GitHub URL', 'Issue URL', 'メモ'];
  const sheet = ensureSheet_(ss, '課題・Gate履歴', 300, headers.length);
  setupTitledTable_(sheet, '技術研修課題・Gate履歴', headers, 2);
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(1);
  setDateFormat_(sheet, [4, 5, 6], 3, NEXUS_CONFIG.maxTrainees);
  setListValidation_(sheet, 2, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.phases);
  setListValidation_(sheet, 3, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.historyStatuses);
  setListValidation_(sheet, 7, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.judgments);
  setWidths_(sheet, [120, 130, 110, 105, 105, 105, 100, 240, 240, 360]);
}

function setupSettings_(ss) {
  const sheet = ensureSheet_(ss, '設定', 100, 6);
  setIfBlank_(sheet.getRange('A1'), '入力候補');
  writeRowIfBlank_(sheet, 2, ['フェーズ', '進捗状況', '判定']);
  writeColumnIfBlank_(sheet, 3, 1, NEXUS_CONFIG.phases);
  writeColumnIfBlank_(sheet, 3, 2, NEXUS_CONFIG.progressStatuses);
  writeColumnIfBlank_(sheet, 3, 3, NEXUS_CONFIG.judgments);
  sheet.getRange('A1:C1').mergeAcross().setBackground(COLORS.title).setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.getRange('A2:C2').setBackground(COLORS.lightGray).setFontWeight('bold');
  setWidths_(sheet, [160, 160, 140]);
}

function setupInteractionSummary_(ss) {
  const headers = ['対象者', '担当区分', '技術研修日', 'NEXUS対応開始日', '最終確認日', '現在状況', '期限', '実提出日', 'やり取り要約', 'Slack根拠', '補助根拠', '確認状態'];
  const sheet = ensureSheet_(ss, 'やり取り要約', 200, headers.length);
  setupTitledTable_(sheet, '技術研修・NEXUS やり取り要約', headers, 2);
  sheet.setFrozenRows(2);
  setDateFormat_(sheet, [3, 4, 5, 7, 8], 3, NEXUS_CONFIG.maxTrainees);
  setListValidation_(sheet, 2, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.assignmentTypes);
  setListValidation_(sheet, 12, 3, NEXUS_CONFIG.maxTrainees, NEXUS_CONFIG.verificationStatuses);
  setWidths_(sheet, [110, 150, 115, 115, 115, 220, 105, 105, 360, 190, 190, 190]);
}

function fillRemainingDayFormulas_(sheet) {
  const formulas = [];
  for (let row = 3; row < 3 + NEXUS_CONFIG.maxTrainees; row += 1) {
    formulas.push([`=IF(OR(A${row}=\"\",F${row}=\"\"),\"\",F${row}-TODAY())`]);
  }
  sheet.getRange(3, 7, formulas.length, 1).setFormulas(formulas).setNumberFormat('0');
}

function applyProgressConditionalFormatting_(sheet) {
  const rules = sheet.getConditionalFormatRules().filter(rule => {
    const ranges = rule.getRanges();
    return !ranges.some(range => range.getColumn() === 5 || range.getColumn() === 7);
  });
  const statusRange = sheet.getRange(3, 5, NEXUS_CONFIG.maxTrainees, 1);
  const remainingRange = sheet.getRange(3, 7, NEXUS_CONFIG.maxTrainees, 1);
  rules.push(
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('要修正').setBackground(COLORS.dangerBg).setFontColor(COLORS.dangerText).setBold(true).setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('合格').setBackground(COLORS.successBg).setFontColor(COLORS.successText).setBold(true).setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setBackground(COLORS.dangerBg).setFontColor(COLORS.dangerText).setBold(true).setRanges([remainingRange]).build()
  );
  sheet.setConditionalFormatRules(rules);
}

function setupTitledTable_(sheet, title, headers, headerRow) {
  const titleRange = sheet.getRange(1, 1, 1, headers.length);
  if (!titleRange.isPartOfMerge()) titleRange.mergeAcross();
  setIfBlank_(sheet.getRange(1, 1), title);
  writeRowIfBlank_(sheet, headerRow, headers);
  titleRange.setBackground(COLORS.title).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(15).setVerticalAlignment('middle');
  sheet.getRange(headerRow, 1, 1, headers.length).setBackground(COLORS.header).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.getRange(headerRow + 1, 1, NEXUS_CONFIG.maxTrainees, headers.length).setVerticalAlignment('middle').setWrap(true);
}

function ensureSheet_(ss, name, rowCount, columnCount) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name, ss.getNumSheets(), {rows: rowCount, columns: columnCount});
  if (sheet.getMaxRows() < rowCount) sheet.insertRowsAfter(sheet.getMaxRows(), rowCount - sheet.getMaxRows());
  if (sheet.getMaxColumns() < columnCount) sheet.insertColumnsAfter(sheet.getMaxColumns(), columnCount - sheet.getMaxColumns());
  return sheet;
}

function requireSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`シート「${name}」がありません。初期設定を実行してください。`);
  return sheet;
}

function setIfBlank_(range, value) {
  if (range.getValue() === '') range.setValue(value);
}

function writeRowIfBlank_(sheet, row, values) {
  const range = sheet.getRange(row, 1, 1, values.length);
  const current = range.getValues()[0];
  range.setValues([values.map((value, index) => current[index] === '' ? value : current[index])]);
}

function writeColumnIfBlank_(sheet, startRow, column, values) {
  const range = sheet.getRange(startRow, column, values.length, 1);
  const current = range.getValues();
  range.setValues(values.map((value, index) => [current[index][0] === '' ? value : current[index][0]]));
}

function setDateFormat_(sheet, columns, startRow, rowCount) {
  columns.forEach(column => sheet.getRange(startRow, column, rowCount, 1).setNumberFormat('yyyy/MM/dd'));
}

function setListValidation_(sheet, column, startRow, rowCount, values) {
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sheet.getRange(startRow, column, rowCount, 1).setDataValidation(rule);
}

function setWidths_(sheet, widths) {
  widths.forEach((width, index) => sheet.setColumnWidth(index + 1, width));
}

