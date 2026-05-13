// ============================================================
// Google Apps Script สำหรับ Axaraa Quotation System
// ============================================================
// วิธีใช้:
// 1. เปิด Google Sheets ใหม่ที่ https://sheets.google.com
// 2. ตั้งชื่อ Sheet ว่า "Axaraa Quotations"
// 3. ใส่หัวคอลัมน์แถวแรก (Row 1):
//    A: quoNo | B: date | C: customerName | D: customerPhone | E: customerEmail
//    F: qty | G: size | H: coverSpecs | I: innerSpecs | J: bindType
//    K: grandTotal | L: costTotal | M: costPerBook
// 4. คลิก Extensions > Apps Script
// 5. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดด้านล่างนี้ลงไป
// 6. คลิก Deploy > New deployment
//    - Select type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 7. คลิก Deploy แล้วคัดลอก URL ที่ได้ไปใส่ใน script.js (ค้นหา GOOGLE_SCRIPT_URL)
// ============================================================

const SHEET_NAME = "Sheet1"; // ชื่อ Sheet tab (ค่าเริ่มต้นจะเป็น Sheet1)

// รับข้อมูลใหม่ (POST) - บันทึกใบเสนอราคา
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    sheet.appendRow([
      data.quoNo,
      data.date,
      data.customerName,
      data.customerPhone,
      data.customerEmail,
      data.qty,
      data.size,
      data.coverSpecs,
      data.innerSpecs,
      data.bindType,
      data.grandTotal,
      data.costTotal,
      data.costPerBook
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "บันทึกข้อมูลเรียบร้อยแล้ว",
      quoNo: data.quoNo
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ค้นหาข้อมูล (GET) - ตรวจสอบเลขที่ใบเสนอราคา
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const quoNo = e.parameter.quoNo;
    const action = e.parameter.action || "verify";
    
    // ดึงข้อมูลทั้งหมด
    if (action === "list") {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1).map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: rows
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ตรวจสอบเลขที่ใบเสนอราคา
    if (action === "verify" && quoNo) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === quoNo) {
          let result = {};
          headers.forEach((h, j) => result[h] = data[i][j]);
          
          return ContentService.createTextOutput(JSON.stringify({
            status: "found",
            data: result
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "not_found",
        message: "ไม่พบเลขที่ใบเสนอราคานี้ในระบบ"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ดึงเลขรันล่าสุด
    if (action === "lastNo") {
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          lastNo: 0
        })).setMimeType(ContentService.MimeType.JSON);
      }
      const lastRow = data[data.length - 1];
      const lastQuoNo = lastRow[0]; // e.g. QT-2026-000003
      const parts = lastQuoNo.split('-');
      const lastNum = parseInt(parts[2]) || 0;
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        lastNo: lastNum
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "กรุณาระบุ action และ parameter ที่ถูกต้อง"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
