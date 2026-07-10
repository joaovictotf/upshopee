// ═══════════════════════════════════════════
// UpShopee — Apps Script para Google Sheets
// Recebe dados do formulário de cadastro
// do Vídeo IA e insere na planilha automaticamente.
// ═══════════════════════════════════════════

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Cadastros Vídeo IA");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    }

    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.nome || "",
      data.cpf || "",
      data.celular || "",
      data.endereco || "",
      data.email || "",
      data.produto || "",
      new Date().toLocaleString("pt-BR")
    ]);

    // Auto-format the new row
    var lastRow = sheet.getLastRow();
    var range = sheet.getRange(lastRow, 1, 1, 7);
    range.setFontFamily("Arial");
    range.setFontSize(11);
    range.setFontColor("#333333");

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      row: lastRow
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    message: "UpShopee Cadastros — Web App ativo",
    total: SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName("Cadastros Vídeo IA")
      .getLastRow() - 1
  })).setMimeType(ContentService.MimeType.JSON);
}
