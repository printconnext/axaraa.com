const paperData = [
    { name: "อาร์ตการ์ด 260 แกรม", type: "cover", priceSheet: 8.5 },
    { name: "อาร์ตการ์ด 310 แกรม", type: "cover", priceSheet: 10.5 },
    { name: "อาร์ตด้าน 105 แกรม", type: "inner", priceSheet: 3.2 },
    { name: "อาร์ตด้าน 128 แกรม", type: "inner", priceSheet: 3.8 },
    { name: "ปอนด์ขาว 80 แกรม", type: "inner", priceSheet: 1.8 },
    { name: "ถนอมสายตา 75 แกรม", type: "inner", priceSheet: 2.2 }
];

const sizeData = {
    "A4": { ratio: 1, name: "A4" },
    "A5": { ratio: 0.5, name: "A5" },
    "A6": { ratio: 0.25, name: "A6" },
    "B5": { ratio: 0.7, name: "B5" },
    "B6": { ratio: 0.35, name: "B6" }
};

const finishingPrices = {
    "ไม่เคลือบ": 0,
    "เคลือบ UV": 1.5,
    "เคลือบ PVC ด้าน/เงา": 3.5,
    "เคลือบ Spot UV": 5.5
};

const bindingPrices = {
    "ไสกาว": 15,
    "เย็บมุงหลังคา": 8
};

const goldStampPrices = {
    "ไม่มี": 0,
    "A5": 15,
    "A4": 25
};

// ============================================================
// Google Apps Script URL - ใส่ URL ที่ได้จากการ Deploy
// ============================================================
const GOOGLE_SCRIPT_URL = "YOUR_GOOGLE_SCRIPT_URL_HERE";

// DOM Elements
const inputs = ['qty', 'size', 'coverPaper', 'coverColor', 'coverFinish', 'goldStamp', 
               'inner1Paper', 'inner1Pages', 'inner1Color', 
               'inner2Paper', 'inner2Pages', 'inner2Color',
               'inner3Paper', 'inner3Pages', 'inner3Color',
               'bindType'];

document.addEventListener('DOMContentLoaded', () => {
    populateSelects();
    initEventListeners();
    loadSavedCustomerInfo();
    calculate();
});

// จดจำข้อมูลลูกค้าที่เคยกรอก
function loadSavedCustomerInfo() {
    const saved = JSON.parse(localStorage.getItem('axaraa_customer') || '{}');
    if (saved.name) document.getElementById('custName').value = saved.name;
    if (saved.phone) document.getElementById('custPhone').value = saved.phone;
    if (saved.email) document.getElementById('custEmail').value = saved.email;
}

function saveCustomerInfo() {
    localStorage.setItem('axaraa_customer', JSON.stringify({
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        email: document.getElementById('custEmail').value
    }));
}

function populateSelects() {
    const coverSelect = document.getElementById('coverPaper');
    const inner1Select = document.getElementById('inner1Paper');
    const inner2Select = document.getElementById('inner2Paper');
    const inner3Select = document.getElementById('inner3Paper');

    paperData.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        
        if (p.type === 'cover') coverSelect.appendChild(opt);
        if (p.type === 'inner') {
            inner1Select.appendChild(opt.cloneNode(true));
            inner2Select.appendChild(opt.cloneNode(true));
            inner3Select.appendChild(opt.cloneNode(true));
        }
    });
}

function initEventListeners() {
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculate);
    });
}

function calculate() {
    const qty = parseInt(document.getElementById('qty').value) || 0;
    const size = document.getElementById('size').value;
    const sizeRatio = sizeData[size].ratio;

    // --- 1. Paper Cost ---
    let totalPaperCost = 0;
    
    const coverPaperName = document.getElementById('coverPaper').value;
    const coverPaperPrice = paperData.find(p => p.name === coverPaperName).priceSheet;
    const coverCost = qty * (coverPaperPrice * sizeRatio * 2);
    totalPaperCost += coverCost;

    function calcInnerPaper(id, pages) {
        if (pages <= 0) return 0;
        const paperName = document.getElementById(id).value;
        const price = paperData.find(p => p.name === paperName).priceSheet;
        return qty * (pages / 8) * price * sizeRatio;
    }

    const inner1Cost = calcInnerPaper('inner1Paper', parseInt(document.getElementById('inner1Pages').value) || 0);
    const inner2Cost = calcInnerPaper('inner2Paper', parseInt(document.getElementById('inner2Pages').value) || 0);
    const inner3Cost = calcInnerPaper('inner3Paper', parseInt(document.getElementById('inner3Pages').value) || 0);
    totalPaperCost += inner1Cost + inner2Cost + inner3Cost;

    // --- 2. Plate Cost ---
    let totalPlateCost = 0;
    const platePricePerColor = 450; 
    
    function getPlateCount(colorVal) {
        if (colorVal.includes('4')) return 4;
        if (colorVal.includes('2')) return 2;
        return 1;
    }

    totalPlateCost += getPlateCount(document.getElementById('coverColor').value) * platePricePerColor;
    
    function calcInnerPlates(pages, colorVal) {
        if (pages <= 0) return 0;
        const signatures = Math.ceil(pages / 16);
        return signatures * getPlateCount(colorVal) * platePricePerColor;
    }

    totalPlateCost += calcInnerPlates(parseInt(document.getElementById('inner1Pages').value) || 0, document.getElementById('inner1Color').value);
    totalPlateCost += calcInnerPlates(parseInt(document.getElementById('inner2Pages').value) || 0, document.getElementById('inner2Color').value);
    totalPlateCost += calcInnerPlates(parseInt(document.getElementById('inner3Pages').value) || 0, document.getElementById('inner3Color').value);

    // --- 3. Printing & Finishing ---
    const printCost = qty * 0.5;
    const coatingCost = qty * finishingPrices[document.getElementById('coverFinish').value];
    const goldStampCost = qty * goldStampPrices[document.getElementById('goldStamp').value];
    const bindingCost = qty * bindingPrices[document.getElementById('bindType').value];

    // --- 4. Totals ---
    const totalCost = totalPaperCost + totalPlateCost + printCost + coatingCost + goldStampCost + bindingCost;
    const costPerBook = qty > 0 ? totalCost / qty : 0;
    
    // Hidden Markup (100% / 2x from actual cost)
    const grandTotal = totalCost * 2;
    const pricePerBook = qty > 0 ? grandTotal / qty : 0;

    // --- 5. UI Update ---
    document.getElementById('res-paper').textContent = formatNum(totalPaperCost);
    document.getElementById('res-plate').textContent = formatNum(totalPlateCost);
    document.getElementById('res-print').textContent = formatNum(printCost);
    document.getElementById('res-coating').textContent = formatNum(coatingCost);
    document.getElementById('res-goldstamp').textContent = formatNum(goldStampCost);
    document.getElementById('res-binding').textContent = formatNum(bindingCost);
    document.getElementById('res-cost-total').textContent = formatNum(totalCost);
    document.getElementById('res-cost-per-book').textContent = formatNum(costPerBook);

    document.getElementById('quo-grand-total').textContent = formatNum(grandTotal);
    document.getElementById('quo-price-per-book').textContent = formatNum(pricePerBook) + " บาท";
}

function formatNum(n) {
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
// Admin Mode
// ============================================================
function toggleAdmin() {
    const pwd = prompt("กรุณากรอกรหัสผ่าน Admin:");
    
    if (pwd === "axaraa123") {
        const breakdown = document.getElementById('cost-breakdown');
        const isHidden = window.getComputedStyle(breakdown).display === 'none';
        breakdown.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            fetchHistoryFromServer();
            alert("เปิดโหมด Admin เรียบร้อยแล้ว");
        }
    } else if (pwd !== null) {
        alert("รหัสผ่านไม่ถูกต้อง");
    }
}

// ดึงประวัติจาก Google Sheets (ถ้าเชื่อมต่อแล้ว)
async function fetchHistoryFromServer() {
    if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL_HERE") return;
    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=list`);
        const json = await res.json();
        if (json.status === "success") {
            const select = document.getElementById('historySelect');
            select.innerHTML = '<option value="">-- เลือกเลขที่ใบเสนอราคา --</option>';
            json.data.reverse().forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.quoNo;
                opt.textContent = `${item.quoNo} | ${item.customerName} | ${item.grandTotal} บาท`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error fetching history:", err);
    }
}

// โหลดข้อมูลจาก Dropdown
async function loadHistory(quoNo) {
    const resultDiv = document.getElementById('verifyResult');
    if (!quoNo) { resultDiv.style.display = 'none'; return; }
    if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL_HERE") {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<span style="color: #aaa;">⚠️ ยังไม่ได้เชื่อมต่อ Google Sheets</span>';
        return;
    }
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span style="color: #aaa;">⏳ กำลังโหลดข้อมูล...</span>';
    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=verify&quoNo=${encodeURIComponent(quoNo)}`);
        const json = await res.json();
        if (json.status === "found") {
            const d = json.data;
            resultDiv.innerHTML = `
                <div style="background: rgba(40,167,69,0.15); border: 1px solid #28a745; border-radius: 6px; padding: 12px; margin-top: 5px;">
                    <div style="color: #28a745; font-weight: bold; margin-bottom: 8px;">✅ ใบเสนอราคานี้สร้างจากระบบจริง</div>
                    <div style="color: #ccc; line-height: 1.6;">
                        <strong>เลขที่:</strong> ${d.quoNo}<br>
                        <strong>วันที่:</strong> ${d.date}<br>
                        <strong>ลูกค้า:</strong> ${d.customerName}<br>
                        <strong>เบอร์โทร:</strong> ${d.customerPhone}<br>
                        <strong>อีเมล:</strong> ${d.customerEmail}<br>
                        <strong>จำนวน:</strong> ${d.qty} เล่ม | <strong>ขนาด:</strong> ${d.size}<br>
                        <strong>ปก:</strong> ${d.coverSpecs}<br>
                        <strong>เนื้อใน:</strong> ${d.innerSpecs}<br>
                        <strong>เข้าเล่ม:</strong> ${d.bindType}<br>
                        <hr style="border-color: #555; margin: 8px 0;">
                        <strong>ราคาสุทธิ (ลูกค้า):</strong> <span style="color: var(--accent); font-size: 1.1rem;">${d.grandTotal} บาท</span><br>
                        <strong>ต้นทุนจริง:</strong> ${d.costTotal} บาท<br>
                        <strong>ต้นทุน/เล่ม:</strong> ${d.costPerBook} บาท
                    </div>
                </div>`;
        } else {
            resultDiv.innerHTML = `
                <div style="background: rgba(220,53,69,0.15); border: 1px solid #dc3545; border-radius: 6px; padding: 12px; margin-top: 5px;">
                    <div style="color: #dc3545; font-weight: bold;">❌ ไม่พบข้อมูลใบเสนอราคานี้</div>
                </div>`;
        }
    } catch (err) {
        resultDiv.innerHTML = '<span style="color: #dc3545;">❌ ไม่สามารถเชื่อมต่อระบบได้</span>';
    }
}

// ดึงเลขรันล่าสุด (จาก Server หรือ localStorage)
async function getNextRunningNo() {
    if (GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_SCRIPT_URL_HERE") {
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=lastNo`);
            const json = await res.json();
            if (json.status === "success") return json.lastNo + 1;
        } catch (err) { console.error("Error getting last no:", err); }
    }
    let local = parseInt(localStorage.getItem('akkhara_running_no') || '0');
    return local + 1;
}

// บันทึกไปยัง Google Sheets (ถ้าเชื่อมต่อแล้ว)
async function saveToServer(data) {
    if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL_HERE") return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            mode: "no-cors"
        });
    } catch (err) { console.error("Error saving to server:", err); }
}

// ============================================================
// ส่งข้อมูลขอใบเสนอราคา + สร้าง PDF
// ============================================================
async function requestQuotation() {
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const email = document.getElementById('custEmail').value;
    
    if (!name || !phone || !email) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, เบอร์โทร, อีเมล)");
        return;
    }

    // จดจำข้อมูลลูกค้าไว้ใช้ครั้งต่อไป
    saveCustomerInfo();

    const qty = document.getElementById('qty').value;
    const size = document.getElementById('size').value;
    const grandTotal = document.getElementById('quo-grand-total').textContent;

    const coverPaper = document.getElementById('coverPaper').value;
    const coverColor = document.getElementById('coverColor').value;
    const coverFinish = document.getElementById('coverFinish').value;
    
    const inner1Pages = document.getElementById('inner1Pages').value;
    const inner1Paper = document.getElementById('inner1Paper').value;
    const bindType = document.getElementById('bindType').value;

    const btn = document.getElementById('submitBtn');
    btn.textContent = "กำลังสร้างใบเสนอราคา...";
    btn.disabled = true;

    // 1. สร้างเลขที่ใบเสนอราคา
    const now = new Date();
    const year = now.getFullYear();
    let runningNo = await getNextRunningNo();
    localStorage.setItem('akkhara_running_no', runningNo);
    const formattedNo = String(runningNo).padStart(6, '0');
    const quoNo = `QT-${year}-${formattedNo}`;

    // 2. ใส่ข้อมูลลงเทมเพลต PDF
    document.getElementById('pdf-date').textContent = now.toLocaleDateString('th-TH');
    document.getElementById('pdf-quo-no').textContent = quoNo;
    document.getElementById('pdf-cust-name').textContent = name;
    document.getElementById('pdf-cust-name-sign').textContent = name;
    document.getElementById('pdf-cust-phone').textContent = phone;
    document.getElementById('pdf-cust-email').textContent = email;
    document.getElementById('pdf-size').textContent = size;
    document.getElementById('pdf-qty').textContent = qty;
    document.getElementById('pdf-cover').textContent = `${coverPaper}, ${coverColor}, ${coverFinish}`;
    document.getElementById('pdf-inner').textContent = `${inner1Pages} หน้า, ${inner1Paper}`;
    document.getElementById('pdf-bind').textContent = bindType;
    document.getElementById('pdf-total').textContent = grandTotal;

    // 3. บันทึกไปยัง Google Sheets (ถ้าเชื่อมต่อแล้ว)
    const costTotal = document.getElementById('res-cost-total').textContent;
    const costPerBook = document.getElementById('res-cost-per-book').textContent;
    
    saveToServer({
        quoNo, date: now.toLocaleDateString('th-TH'),
        customerName: name, customerPhone: phone, customerEmail: email,
        qty, size,
        coverSpecs: `${coverPaper}, ${coverColor}, ${coverFinish}`,
        innerSpecs: `${inner1Pages} หน้า, ${inner1Paper}`,
        bindType, grandTotal, costTotal, costPerBook
    });

    // 4. สร้างไฟล์ PDF
    btn.textContent = "กำลังสร้าง PDF...";
    const element = document.getElementById('quotation-template');
    element.style.display = 'block';
    
    // รอให้ browser render เทมเพลตก่อน
    await new Promise(resolve => setTimeout(resolve, 500));

    const opt = {
        margin: 10,
        filename: `Quotation_Axaraa_${quoNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(async () => {
        element.style.display = 'none';

        // 5. ส่งอีเมลผ่าน Formspree
        const form = document.getElementById('quoteForm');
        const formData = new FormData(form);

        try {
            const response = await fetch("https://formspree.io/f/xqennrbe", {
                method: "POST",
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                document.getElementById('formStatus').style.display = 'block';
                form.style.display = 'none';
            } else {
                btn.textContent = "ส่งข้อมูลขอใบเสนอราคา (อัตโนมัติ)";
                btn.disabled = false;
            }
        } catch (error) {
            console.error("Error:", error);
            btn.textContent = "ส่งข้อมูลขอใบเสนอราคา (อัตโนมัติ)";
            btn.disabled = false;
        }
    });
}
