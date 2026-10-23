// High-Definition Canvas Photo Generator for FieldFlow WhatsApp Sharing
// Formatted to exactly match the FieldFlow Admin Portal Tables (Light Mode UI)

/**
 * Draws rounded rectangle helper
 */
function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Common Card Background & Header for Authentic UI look
 */
function paintCardHeader(ctx, width, title, subtitle, dateBadge) {
  // Title
  ctx.font = '800 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(title, 32, 48);

  // Subtitle
  if (subtitle) {
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(subtitle, 32, 70);
  }

  // Date pill (Top Right)
  if (dateBadge) {
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textW = ctx.measureText(dateBadge).width;
    const badgeW = Math.max(140, textW + 28);
    drawRoundedRect(ctx, width - 32 - badgeW, 30, badgeW, 34, 8, '#F1F5F9', '#CBD5E1', 1);
    ctx.fillStyle = '#334155';
    ctx.fillText(dateBadge, width - 32 - badgeW + 14, 52);
  }
}

/**
 * Common Card Footer
 */
function paintCardFooter(ctx, width, height, customNote) {
  const lineY = height - 42;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, lineY);
  ctx.lineTo(width - 32, lineY);
  ctx.stroke();

  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(customNote || `FieldFlow Operations Center • Generated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 32, height - 18);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#16A34A';
  ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('✓ Verified Operations Record', width - 32, height - 18);
  ctx.textAlign = 'left';
}

/**
 * Convert Canvas to Blob and DataURL
 */
function canvasToOutputs(canvas, fileName = 'FieldFlow_Report.png') {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const dataUrl = canvas.toDataURL('image/png');
      const file = new File([blob], fileName, { type: 'image/png' });
      resolve({ blob, dataUrl, file });
    }, 'image/png');
  });
}

/**
 * 1. Daily Field Staff Visit Matrix (Time-Slot & Portfolio Breakdown)
 * Exactly reproduces the user's uploaded screenshot
 */
export async function generateVisitModelImage({
  date,
  totalVisits = 0,
  rows = [],
  columnTotals = {},
  grandTotalVisits = 0,
}) {
  const width = 1320;
  const cardPadX = 32;
  const tableX = cardPadX;
  const tableY = 96;
  const tableW = width - cardPadX * 2; // 1256px

  const feNameW = 216;
  const colW = 48; // 20 columns * 48 = 960px
  const totalW = tableW - feNameW - colW * 20; // 80px

  const headerH1 = 36;
  const headerH2 = 32;
  const headerTotalH = headerH1 + headerH2; // 68px
  const rowH = 38;

  const rowCount = Math.max(1, rows.length);
  const isZero = rows.length === 0;
  const tableBodyH = isZero ? 120 : (rows.length * rowH + 42); // 42px for grand total row

  const height = tableY + headerTotalH + tableBodyH + 70; // 70px for footer & padding

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Clean White Background for outer document
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Paint Card Header
  paintCardHeader(
    ctx,
    width,
    'Daily Visit Update',
    '',
    `📅 ${date || 'Today'}`
  );

  const slots = [
    { name: '9-11', bg: '#FEF08A', text: '#854D0E', border: '#FDE047' },
    { name: '11-1', bg: '#67E8F9', text: '#0E7490', border: '#22D3EE' },
    { name: '1-3',  bg: '#93C5FD', text: '#1E40AF', border: '#60A5FA' },
    { name: '3-5',  bg: '#FCA5A5', text: '#991B1B', border: '#F87171' },
    { name: '5-6',  bg: '#FDBA74', text: '#9A3412', border: '#FB923C' },
  ];
  const pCols = ['KB', 'SC', 'NAVI', 'MV'];

  // Table Outer Border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(tableX, tableY, tableW, headerTotalH + tableBodyH);

  // ==========================================
  // TIER 1 HEADER
  // ==========================================
  // 1. FE NAME (Blue box spanning Row 1 & Row 2)
  drawRoundedRect(ctx, tableX, tableY, feNameW, headerTotalH, [8, 0, 0, 0], '#2563EB', '#1D4ED8', 1);
  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('FE NAME', tableX + 16, tableY + headerTotalH / 2 + 5);

  // 2. Five Time Slots
  slots.forEach((s, idx) => {
    const sx = tableX + feNameW + idx * (colW * 4);
    ctx.fillStyle = s.bg;
    ctx.fillRect(sx, tableY, colW * 4, headerH1);
    ctx.strokeStyle = s.border;
    ctx.strokeRect(sx, tableY, colW * 4, headerH1);

    ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = s.text;
    ctx.textAlign = 'center';
    ctx.fillText(s.name, sx + (colW * 4) / 2, tableY + headerH1 / 2 + 5);
  });

  // 3. TOTAL (Blue box spanning Row 1 & Row 2)
  const totalX = tableX + feNameW + colW * 20;
  drawRoundedRect(ctx, totalX, tableY, totalW, headerTotalH, [0, 8, 0, 0], '#2563EB', '#1D4ED8', 1);
  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('TOTAL', totalX + totalW / 2, tableY + headerTotalH / 2 + 5);
  ctx.textAlign = 'left';

  // ==========================================
  // TIER 2 HEADER (Portfolio Sub-Columns)
  // ==========================================
  const t2Y = tableY + headerH1;
  slots.forEach((s, sIdx) => {
    pCols.forEach((p, pIdx) => {
      const cx = tableX + feNameW + sIdx * (colW * 4) + pIdx * colW;
      const isNavi = p === 'NAVI';

      ctx.fillStyle = isNavi ? '#CFFAFE' : '#F8FAFC';
      ctx.fillRect(cx, t2Y, colW, headerH2);

      ctx.strokeStyle = isNavi ? '#0891B2' : '#E2E8F0';
      ctx.lineWidth = isNavi ? 1.5 : 1;
      ctx.strokeRect(cx, t2Y, colW, headerH2);

      ctx.font = isNavi ? '800 11px -apple-system, sans-serif' : '700 11px -apple-system, sans-serif';
      ctx.fillStyle = isNavi ? '#0891B2' : '#64748B';
      ctx.textAlign = 'center';
      ctx.fillText(p, cx + colW / 2, t2Y + headerH2 / 2 + 4);
    });
  });
  ctx.textAlign = 'left';

  // ==========================================
  // TABLE BODY
  // ==========================================
  const bodyY = tableY + headerTotalH;

  if (isZero) {
    // Empty state matching the screenshot
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tableX, bodyY, tableW, tableBodyH);

    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('No field staff visit matrix records available for this date.', tableX + tableW / 2, bodyY + tableBodyH / 2 + 5);
    ctx.textAlign = 'left';
  } else {
    // Render Rows
    rows.forEach((r, rIdx) => {
      const ry = bodyY + rIdx * rowH;
      const isAlt = rIdx % 2 === 1;

      // FE Name cell
      ctx.fillStyle = isAlt ? '#F8FAFC' : '#FFFFFF';
      ctx.fillRect(tableX, ry, feNameW, rowH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(tableX, ry, feNameW, rowH);

      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = r.isAbsent ? '#EF4444' : '#0F172A';
      ctx.fillText(r.feName || 'Staff', tableX + 14, ry + rowH / 2 + 5);

      // 20 portfolio cells
      slots.forEach((s, sIdx) => {
        pCols.forEach((p, pIdx) => {
          const cx = tableX + feNameW + sIdx * (colW * 4) + pIdx * colW;
          const val = r.slots?.[s.name]?.[p];
          const isAb = val === 'AB' || (r.isAbsent && (val === 0 || val === undefined));
          const isNavi = p === 'NAVI';

          let cellBg = isAlt ? '#F8FAFC' : '#FFFFFF';
          let cellText = val !== undefined ? String(val) : (r.isAbsent ? 'AB' : '0');
          let cellColor = '#94A3B8';
          let cellWeight = '500 12px';

          if (isAb) {
            cellBg = '#FEE2E2';
            cellText = 'AB';
            cellColor = '#DC2626';
            cellWeight = '700 11px';
          } else if (isNavi && typeof val === 'number' && val > 0) {
            cellBg = '#ECFEFF';
            cellText = String(val);
            cellColor = '#0891B2';
            cellWeight = '800 12px';
          } else if (typeof val === 'number' && val > 0) {
            cellText = String(val);
            cellColor = '#0F172A';
            cellWeight = '800 12px';
          }

          ctx.fillStyle = cellBg;
          ctx.fillRect(cx, ry, colW, rowH);
          ctx.strokeStyle = '#E2E8F0';
          ctx.strokeRect(cx, ry, colW, rowH);

          ctx.font = `${cellWeight} -apple-system, sans-serif`;
          ctx.fillStyle = cellColor;
          ctx.textAlign = 'center';
          ctx.fillText(cellText, cx + colW / 2, ry + rowH / 2 + 4);
        });
      });

      // Total cell
      ctx.fillStyle = '#EFF6FF';
      ctx.fillRect(totalX, ry, totalW, rowH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(totalX, ry, totalW, rowH);

      ctx.font = '800 13px -apple-system, sans-serif';
      ctx.fillStyle = '#1D4ED8';
      ctx.textAlign = 'center';
      ctx.fillText(String(r.totalVisits || 0), totalX + totalW / 2, ry + rowH / 2 + 5);
      ctx.textAlign = 'left';
    });

    // Grand Total Row
    const grandY = bodyY + rows.length * rowH;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(tableX, grandY, feNameW, 42);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(tableX, grandY, feNameW, 42);

    ctx.font = '900 13px -apple-system, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Grand Total', tableX + 14, grandY + 26);

    slots.forEach((s, sIdx) => {
      pCols.forEach((p, pIdx) => {
        const cx = tableX + feNameW + sIdx * (colW * 4) + pIdx * colW;
        const colTotal = columnTotals?.[s.name]?.[p] ?? 0;

        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(cx, grandY, colW, 42);
        ctx.strokeStyle = '#94A3B8';
        ctx.strokeRect(cx, grandY, colW, 42);

        ctx.font = '800 12px -apple-system, sans-serif';
        ctx.fillStyle = colTotal > 0 ? '#0F172A' : '#64748B';
        ctx.textAlign = 'center';
        ctx.fillText(String(colTotal), cx + colW / 2, grandY + 26);
      });
    });

    // Grand Total Visits
    ctx.fillStyle = '#BFDBFE';
    ctx.fillRect(totalX, grandY, totalW, 42);
    ctx.strokeStyle = '#94A3B8';
    ctx.strokeRect(totalX, grandY, totalW, 42);

    ctx.font = '900 14px -apple-system, sans-serif';
    ctx.fillStyle = '#1E40AF';
    ctx.textAlign = 'center';
    ctx.fillText(String(grandTotalVisits || totalVisits || 0), totalX + totalW / 2, grandY + 26);
    ctx.textAlign = 'left';
  }

  paintCardFooter(ctx, width, height, 'FieldFlow Operations Intelligence • Daily Visit Update');

  return canvasToOutputs(canvas, `FieldFlow_Daily_Visit_Update_${date || Date.now()}.png`);
}

/**
 * 2. Individual Officer Daily Visit Image (exact same 2-tier matrix format for 1 officer)
 */
export async function generateStaffVisitImage(row, reportStartDate) {
  return generateVisitModelImage({
    date: reportStartDate,
    totalVisits: row.totalVisits || 0,
    rows: [row],
    columnTotals: row.slots || {},
    grandTotalVisits: row.totalVisits || 0,
  });
}

/**
 * 3. Collection Performance & Target Matrix Table Image (exact light theme table format)
 */
export async function generateCollectionModelImage({ period, total = {}, rows = [] }) {
  const width = 1200;
  const cardPadX = 32;
  const tableX = cardPadX;
  const tableY = 96;
  const tableW = width - cardPadX * 2; // 1136px

  const cols = [
    { name: 'FS NAME', w: 200, align: 'left' },
    { name: 'Sum of POS', w: 140, align: 'right' },
    { name: 'Count of POS', w: 100, align: 'center' },
    { name: 'Sum of COLLECTION', w: 160, align: 'right' },
    { name: 'TARGET', w: 140, align: 'right' },
    { name: 'DRR', w: 120, align: 'right' },
    { name: 'YET TO GO', w: 140, align: 'right' },
    { name: 'ACH%', w: 136, align: 'center' },
  ];

  const headerH = 40;
  const rowH = 38;
  const isZero = rows.length === 0;
  const tableBodyH = isZero ? 120 : (rows.length * rowH + 44);
  const height = tableY + headerH + tableBodyH + 70;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  paintCardHeader(
    ctx,
    width,
    'Collection Report',
    '',
    `📅 ${period || 'Today'}`
  );

  // Table Header
  let curX = tableX;
  cols.forEach((col, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === cols.length - 1;
    drawRoundedRect(ctx, curX, tableY, col.w, headerH, isFirst ? [8, 0, 0, 0] : isLast ? [0, 8, 0, 0] : 0, '#2563EB', '#1D4ED8', 1);

    ctx.font = '800 12px -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    if (col.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(col.name, curX + col.w / 2, tableY + headerH / 2 + 4);
    } else if (col.align === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(col.name, curX + col.w - 14, tableY + headerH / 2 + 4);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(col.name, curX + 14, tableY + headerH / 2 + 4);
    }
    curX += col.w;
  });
  ctx.textAlign = 'left';

  // Body
  const bodyY = tableY + headerH;
  if (isZero) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tableX, bodyY, tableW, tableBodyH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(tableX, bodyY, tableW, tableBodyH);

    ctx.font = '500 14px -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('No staff performance records available for this period.', tableX + tableW / 2, bodyY + tableBodyH / 2 + 5);
    ctx.textAlign = 'left';
  } else {
    rows.forEach((r, rIdx) => {
      const ry = bodyY + rIdx * rowH;
      const isAlt = rIdx % 2 === 1;

      let cx = tableX;
      cols.forEach((col, cIdx) => {
        let cellBg = isAlt ? '#F8FAFC' : '#FFFFFF';
        let cellColor = '#0F172A';
        let cellVal = '';

        if (cIdx === 0) cellVal = r.fsName || 'Staff';
        else if (cIdx === 1) cellVal = (r.sumOfPos || 0).toLocaleString('en-IN');
        else if (cIdx === 2) cellVal = String(r.countOfPos || 0);
        else if (cIdx === 3) {
          cellVal = (r.sumOfCollection || 0).toLocaleString('en-IN');
          cellBg = r.sumOfCollection > 0 ? '#FEF08A' : '#FECACA';
          cellColor = r.sumOfCollection > 0 ? '#854D0E' : '#991B1B';
        } else if (cIdx === 4) cellVal = (r.target || 0).toLocaleString('en-IN');
        else if (cIdx === 5) cellVal = (r.drr || 0).toLocaleString('en-IN');
        else if (cIdx === 6) {
          cellVal = (r.yetToGo || 0).toLocaleString('en-IN');
          cellBg = r.yetToGo <= 0 || r.achPercent >= 100 ? '#BBF7D0' : '#FEF08A';
          cellColor = r.yetToGo <= 0 || r.achPercent >= 100 ? '#14532D' : '#854D0E';
        } else if (cIdx === 7) {
          cellVal = `${r.achPercent || 0}%`;
          cellBg = r.achPercent >= 40 ? '#BBF7D0' : r.achPercent >= 10 ? '#FEF08A' : '#FECACA';
          cellColor = r.achPercent >= 40 ? '#14532D' : r.achPercent >= 10 ? '#854D0E' : '#991B1B';
        }

        ctx.fillStyle = cellBg;
        ctx.fillRect(cx, ry, col.w, rowH);
        ctx.strokeStyle = '#E2E8F0';
        ctx.strokeRect(cx, ry, col.w, rowH);

        ctx.font = '700 12px -apple-system, sans-serif';
        ctx.fillStyle = cellColor;
        if (col.align === 'center') {
          ctx.textAlign = 'center';
          ctx.fillText(cellVal, cx + col.w / 2, ry + rowH / 2 + 4);
        } else if (col.align === 'right') {
          ctx.textAlign = 'right';
          ctx.fillText(cellVal, cx + col.w - 14, ry + rowH / 2 + 4);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(cellVal, cx + 14, ry + rowH / 2 + 4);
        }
        cx += col.w;
      });
      ctx.textAlign = 'left';
    });

    // Grand Total
    const grandY = bodyY + rows.length * rowH;
    let cx = tableX;
    cols.forEach((col, cIdx) => {
      let cellBg = '#E2E8F0';
      let cellColor = '#0F172A';
      let cellVal = '';

      if (cIdx === 0) cellVal = 'Grand Total';
      else if (cIdx === 1) cellVal = (total.sumOfPos || 0).toLocaleString('en-IN');
      else if (cIdx === 2) cellVal = String(total.countOfPos || 0);
      else if (cIdx === 3) {
        cellVal = (total.sumOfCollection || 0).toLocaleString('en-IN');
        cellBg = '#86EFAC';
        cellColor = '#14532D';
      } else if (cIdx === 4) cellVal = (total.target || 0).toLocaleString('en-IN');
      else if (cIdx === 5) cellVal = (total.drr || 0).toLocaleString('en-IN');
      else if (cIdx === 6) {
        cellVal = (total.yetToGo || 0).toLocaleString('en-IN');
        cellBg = '#FCA5A5';
        cellColor = '#7F1D1D';
      } else if (cIdx === 7) {
        cellVal = `${total.achPercent || 0}%`;
        cellBg = total.achPercent >= 40 ? '#86EFAC' : total.achPercent >= 10 ? '#FEF08A' : '#FCA5A5';
        cellColor = total.achPercent >= 40 ? '#14532D' : total.achPercent >= 10 ? '#854D0E' : '#7F1D1D';
      }

      ctx.fillStyle = cellBg;
      ctx.fillRect(cx, grandY, col.w, 44);
      ctx.strokeStyle = '#94A3B8';
      ctx.strokeRect(cx, grandY, col.w, 44);

      ctx.font = '900 13px -apple-system, sans-serif';
      ctx.fillStyle = cellColor;
      if (col.align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(cellVal, cx + col.w / 2, grandY + 26);
      } else if (col.align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(cellVal, cx + col.w - 14, grandY + 26);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(cellVal, cx + 14, grandY + 26);
      }
      cx += col.w;
    });
    ctx.textAlign = 'left';
  }

  paintCardFooter(ctx, width, height, 'FieldFlow Operations Intelligence • Collection Report');

  return canvasToOutputs(canvas, `FieldFlow_Collection_Model_${period || Date.now()}.png`);
}

/**
 * 4. Staff Performance Individual Row Image
 */
export async function generateStaffPerformanceImage(row) {
  return generateCollectionModelImage({
    period: 'Today Update',
    total: {
      sumOfPos: row.sumOfPos || 0,
      countOfPos: row.countOfPos || 0,
      sumOfCollection: row.sumOfCollection || 0,
      target: row.target || 0,
      drr: row.drr || 0,
      yetToGo: row.yetToGo || 0,
      achPercent: row.achPercent || 0,
    },
    rows: [row],
  });
}

/**
 * 5. Collection Ledger Report Image (Light Table)
 */
export async function generateCollectionLedgerImage({ period, totalAmount = 0, totalCount = 0, verifiedCount = 0, rows = [] }) {
  const width = 1100;
  const cardPadX = 32;
  const tableX = cardPadX;
  const tableY = 96;
  const tableW = width - cardPadX * 2;

  const cols = [
    { name: '#', w: 60, align: 'center' },
    { name: 'AMOUNT', w: 160, align: 'right' },
    { name: 'CUSTOMER NAME', w: 320, align: 'left' },
    { name: 'COLLECTED BY', w: 240, align: 'left' },
    { name: 'MODE', w: 120, align: 'center' },
    { name: 'STATUS', w: 136, align: 'center' },
  ];

  const headerH = 40;
  const rowH = 38;
  const isZero = rows.length === 0;
  const tableBodyH = isZero ? 120 : (rows.length * rowH);
  const height = tableY + headerH + tableBodyH + 70;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  paintCardHeader(
    ctx,
    width,
    'FieldFlow Collection Ledger Transactions',
    `Verified Receipts: ${verifiedCount} / ${totalCount} • Total Amount: ₹${Number(totalAmount).toLocaleString('en-IN')}`,
    `📅 ${period || 'Today'}`
  );

  let curX = tableX;
  cols.forEach((col, idx) => {
    drawRoundedRect(ctx, curX, tableY, col.w, headerH, idx === 0 ? [8, 0, 0, 0] : idx === cols.length - 1 ? [0, 8, 0, 0] : 0, '#2563EB', '#1D4ED8', 1);
    ctx.font = '800 12px -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
    ctx.fillText(col.name, col.align === 'center' ? curX + col.w / 2 : col.align === 'right' ? curX + col.w - 14 : curX + 14, tableY + headerH / 2 + 4);
    curX += col.w;
  });
  ctx.textAlign = 'left';

  const bodyY = tableY + headerH;
  if (isZero) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tableX, bodyY, tableW, tableBodyH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(tableX, bodyY, tableW, tableBodyH);
    ctx.font = '500 14px -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('No collection records found for this period.', tableX + tableW / 2, bodyY + tableBodyH / 2 + 5);
    ctx.textAlign = 'left';
  } else {
    rows.forEach((c, i) => {
      const ry = bodyY + i * rowH;
      const isAlt = i % 2 === 1;

      const cust = c.caseId?.customerId?.name || c.customerId?.name || 'Customer';
      const officer = c.collectedBy?.name || 'Staff';
      const mode = (c.paymentMode || 'Cash').toUpperCase();
      const status = (c.status || 'Verified').toUpperCase();

      let cx = tableX;
      [
        { val: String(i + 1), align: 'center', color: '#64748B' },
        { val: `₹${(c.amount || 0).toLocaleString('en-IN')}`, align: 'right', color: '#16A34A', bold: true },
        { val: cust.slice(0, 36), align: 'left', color: '#0F172A', bold: true },
        { val: officer.slice(0, 26), align: 'left', color: '#475569' },
        { val: mode, align: 'center', color: '#64748B' },
        { val: status, align: 'center', color: status.includes('APP') || status.includes('VER') ? '#16A34A' : '#D97706', bold: true },
      ].forEach((cell, idx) => {
        const col = cols[idx];
        ctx.fillStyle = isAlt ? '#F8FAFC' : '#FFFFFF';
        ctx.fillRect(cx, ry, col.w, rowH);
        ctx.strokeStyle = '#E2E8F0';
        ctx.strokeRect(cx, ry, col.w, rowH);

        ctx.font = cell.bold ? '700 12px -apple-system, sans-serif' : '500 12px -apple-system, sans-serif';
        ctx.fillStyle = cell.color;
        ctx.textAlign = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
        ctx.fillText(cell.val, col.align === 'center' ? cx + col.w / 2 : col.align === 'right' ? cx + col.w - 14 : cx + 14, ry + rowH / 2 + 4);
        cx += col.w;
      });
      ctx.textAlign = 'left';
    });
  }

  paintCardFooter(ctx, width, height, 'FieldFlow Ledger Receipts • Verified Transactions');
  return canvasToOutputs(canvas, `FieldFlow_Ledger_${period || Date.now()}.png`);
}

/**
 * 6. Daily Visits Summary Log Image
 */
export async function generateVisitSummaryImage({ period, totalVisits = 0, rows = [] }) {
  const width = 1100;
  const cardPadX = 32;
  const tableX = cardPadX;
  const tableY = 96;
  const tableW = width - cardPadX * 2;

  const cols = [
    { name: '#', w: 60, align: 'center' },
    { name: 'CUSTOMER NAME', w: 360, align: 'left' },
    { name: 'FIELD STAFF', w: 260, align: 'left' },
    { name: 'OUTCOME', w: 236, align: 'center' },
    { name: 'TIME', w: 120, align: 'center' },
  ];

  const headerH = 40;
  const rowH = 38;
  const isZero = rows.length === 0;
  const tableBodyH = isZero ? 120 : (rows.length * rowH);
  const height = tableY + headerH + tableBodyH + 70;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  paintCardHeader(
    ctx,
    width,
    'Daily Field Visits Activity Log',
    `Total Completed Visits: ${totalVisits}`,
    `📅 ${period || 'Today'}`
  );

  let curX = tableX;
  cols.forEach((col, idx) => {
    drawRoundedRect(ctx, curX, tableY, col.w, headerH, idx === 0 ? [8, 0, 0, 0] : idx === cols.length - 1 ? [0, 8, 0, 0] : 0, '#2563EB', '#1D4ED8', 1);
    ctx.font = '800 12px -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = col.align === 'center' ? 'center' : 'left';
    ctx.fillText(col.name, col.align === 'center' ? curX + col.w / 2 : curX + 14, tableY + headerH / 2 + 4);
    curX += col.w;
  });
  ctx.textAlign = 'left';

  const bodyY = tableY + headerH;
  if (isZero) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tableX, bodyY, tableW, tableBodyH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(tableX, bodyY, tableW, tableBodyH);
    ctx.font = '500 14px -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('No field visits recorded for this period.', tableX + tableW / 2, bodyY + tableBodyH / 2 + 5);
    ctx.textAlign = 'left';
  } else {
    rows.forEach((v, i) => {
      const ry = bodyY + i * rowH;
      const isAlt = i % 2 === 1;

      const cust = v.caseId?.customerId?.name || v.customerName || 'Customer';
      const officer = v.staffId?.name || v.staffName || 'Staff';
      const outcome = (v.outcome || 'Visit Completed').toUpperCase();
      const timeStr = v.createdAt ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Field Log';

      let cx = tableX;
      [
        { val: String(i + 1), align: 'center', color: '#64748B' },
        { val: cust.slice(0, 40), align: 'left', color: '#0F172A', bold: true },
        { val: officer.slice(0, 30), align: 'left', color: '#475569' },
        { val: outcome, align: 'center', color: outcome.includes('PTP') ? '#16A34A' : '#2563EB', bold: true },
        { val: timeStr, align: 'center', color: '#64748B' },
      ].forEach((cell, idx) => {
        const col = cols[idx];
        ctx.fillStyle = isAlt ? '#F8FAFC' : '#FFFFFF';
        ctx.fillRect(cx, ry, col.w, rowH);
        ctx.strokeStyle = '#E2E8F0';
        ctx.strokeRect(cx, ry, col.w, rowH);

        ctx.font = cell.bold ? '700 12px -apple-system, sans-serif' : '500 12px -apple-system, sans-serif';
        ctx.fillStyle = cell.color;
        ctx.textAlign = col.align === 'center' ? 'center' : 'left';
        ctx.fillText(cell.val, col.align === 'center' ? cx + col.w / 2 : cx + 14, ry + rowH / 2 + 4);
        cx += col.w;
      });
      ctx.textAlign = 'left';
    });
  }

  paintCardFooter(ctx, width, height, 'FieldFlow Visits Intelligence • Verified Field Logs');
  return canvasToOutputs(canvas, `FieldFlow_Visits_${period || Date.now()}.png`);
}
