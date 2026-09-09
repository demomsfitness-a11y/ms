import jsPDF from 'jspdf';
import { Payment, Member, GymSettings } from '../types';
import { extractUpiTransactionNumber } from './planUtils';

export function buildReceiptPdfDocument(
  payment: Payment,
  member: Member | undefined,
  settings: GymSettings,
  adminEmail: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryRed = [220, 38, 38]; // #DC2626
  const darkBg = [17, 17, 17]; // #111111
  const grayText = [115, 115, 115];
  const lightGray = [245, 245, 245];

  // Header Banner
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Red accent line
  doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.rect(0, 42, pageWidth, 3, 'F');

  // Gym Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(settings.gym_name || 'MS FITNESS', 15, 20);

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(239, 68, 68); // Red text
  doc.text((settings.tagline || 'STRONGER BODY, STRONGER YOU').toUpperCase(), 15, 27);

  // Gym Contact Info (Top Right)
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(settings.phone || '+91 98765 43210', pageWidth - 15, 16, { align: 'right' });
  doc.text(settings.email || 'contact@msfitness.com', pageWidth - 15, 21, { align: 'right' });
  doc.text(settings.address || 'Fitness District, New Delhi, India', pageWidth - 15, 26, { align: 'right' });
  if (settings.upi_id) {
    doc.text(`UPI: ${settings.upi_id}`, pageWidth - 15, 31, { align: 'right' });
  }

  // Title: OFFICIAL PAYMENT RECEIPT
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OFFICIAL PAYMENT RECEIPT', 15, 56);

  // Receipt Number & Payment ID Box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(pageWidth - 85, 48, 70, 24, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Receipt No:', pageWidth - 80, 55);
  doc.text('Payment ID:', pageWidth - 80, 61);
  doc.text('Date:', pageWidth - 80, 67);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text(payment.receipt_number || 'N/A', pageWidth - 20, 55, { align: 'right' });
  doc.text(payment.payment_id || 'N/A', pageWidth - 20, 61, { align: 'right' });
  doc.text(new Date(payment.payment_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }), pageWidth - 20, 67, { align: 'right' });

  // Member Information Section
  const effectiveMember = member || {
    id: payment.member_id,
    member_id: payment.member_code || 'N/A',
    name: payment.member_name || 'Member',
    mobile: payment.member_mobile || 'N/A',
    email: (payment as any).member_email || '',
    gender: 'other' as const,
    join_date: (payment as any).join_date || payment.payment_date,
    plan_amount: Number(payment.total_due || payment.amount),
    discount: Number(payment.discount || 0),
    membership_start: (payment as any).membership_start || payment.payment_date,
    membership_expiry: (payment as any).membership_expiry || '',
    status: 'active' as const,
  };

  const isUpi = payment.payment_method === 'UPI';
  const txnNum =
    payment.upi_transaction_number ||
    payment.transaction_number ||
    extractUpiTransactionNumber(payment.notes);
  const hasUpiTxn = isUpi && !!txnNum;
  const boxHeight = hasUpiTxn ? 48 : 42;

  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(15, 78, pageWidth - 30, boxHeight, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.text('MEMBER DETAILS', 22, 85);

  // Member details columns
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Member Name:', 22, 92);
  doc.text('Member ID:', 22, 98);
  doc.text('Mobile Number:', 22, 104);
  doc.text('Payment Mode:', 22, 110);
  if (hasUpiTxn) {
    doc.text('UPI Txn No:', 22, 116);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text(effectiveMember.name || payment.member_name || 'Member', 55, 92);
  doc.text(effectiveMember.member_id || payment.member_code || 'N/A', 55, 98);
  doc.text(effectiveMember.mobile || payment.member_mobile || 'N/A', 55, 104);

  // Payment method badge
  doc.setTextColor(isUpi ? 37 : 22, isUpi ? 99 : 101, isUpi ? 235 : 52);
  doc.text(payment.payment_method.toUpperCase(), 55, 110);

  if (hasUpiTxn) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.text(String(txnNum), 55, 116);
  }

  // Right side of member box
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Plan Enrolled:', pageWidth / 2 + 10, 92);
  doc.text('Membership Start:', pageWidth / 2 + 10, 98);
  doc.text('Membership Expiry:', pageWidth / 2 + 10, 104);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text(payment.plan_name || 'Gym Membership', pageWidth / 2 + 48, 92);
  const startDateStr = effectiveMember.membership_start || (payment as any).membership_start || payment.payment_date;
  const expiryDateStr = effectiveMember.membership_expiry || (payment as any).membership_expiry;
  doc.text(startDateStr ? new Date(startDateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) : 'N/A', pageWidth / 2 + 48, 98);
  doc.text(expiryDateStr ? new Date(expiryDateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) : 'Active', pageWidth / 2 + 48, 104);

  // Financial Breakdown Table
  const tableTop = hasUpiTxn ? 133 : 127;
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(15, tableTop, pageWidth - 30, 9, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION / PARTICULARS', 22, tableTop + 6);
  doc.text('AMOUNT (INR)', pageWidth - 22, tableTop + 6, { align: 'right' });

  let curY = tableTop + 16;
  const items = [
    { label: 'Current Membership Plan Fee', value: Number(payment.total_due - (payment.previous_balance || 0) + (payment.discount || 0)) },
    { label: 'Discount Applied (-)', value: -Number(payment.discount || 0), isNegative: true },
    { label: 'Previous Outstanding Balance (+)', value: Number(payment.previous_balance || 0) },
  ];

  doc.setFontSize(9);
  items.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(item.label, 22, curY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.isNegative ? 220 : 17, item.isNegative ? 38 : 17, item.isNegative ? 38 : 17);
    const formattedVal = item.value < 0 ? `- ₹${Math.abs(item.value).toLocaleString('en-IN')}` : `₹${item.value.toLocaleString('en-IN')}`;
    doc.text(formattedVal, pageWidth - 22, curY, { align: 'right' });

    // Light dotted separator line
    doc.setDrawColor(240, 240, 240);
    doc.line(22, curY + 2, pageWidth - 22, curY + 2);
    curY += 9;
  });

  // Total Due Bar
  doc.setFillColor(245, 245, 245);
  doc.rect(15, curY, pageWidth - 30, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text('Total Amount Due', 22, curY + 6);
  doc.text(`₹${Number(payment.total_due).toLocaleString('en-IN')}`, pageWidth - 22, curY + 6, { align: 'right' });
  curY += 14;

  // Amount Paid Highlight Box (Green/Bold)
  doc.setFillColor(236, 253, 245); // light green
  doc.setDrawColor(16, 185, 129); // green-500
  doc.roundedRect(15, curY, (pageWidth - 35) / 2, 20, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(6, 95, 70);
  doc.text('AMOUNT RECEIVED', 22, curY + 7);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(`₹${Number(payment.amount).toLocaleString('en-IN')}`, 22, curY + 15);

  // Remaining Balance Highlight Box (Red if > 0, Gray if 0)
  const hasRemaining = Number(payment.remaining_balance) > 0;
  doc.setFillColor(hasRemaining ? 254 : 243, hasRemaining ? 242 : 244, hasRemaining ? 242 : 246);
  doc.setDrawColor(hasRemaining ? 239 : 209, hasRemaining ? 68 : 213, hasRemaining ? 68 : 219);
  doc.roundedRect(pageWidth / 2 + 2.5, curY, (pageWidth - 35) / 2, 20, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(hasRemaining ? 153 : 75, hasRemaining ? 27 : 85, hasRemaining ? 27 : 99);
  doc.text('REMAINING BALANCE (DUE)', pageWidth / 2 + 9, curY + 7);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(hasRemaining ? 220 : 75, hasRemaining ? 38 : 85, hasRemaining ? 38 : 99);
  doc.text(`₹${Number(payment.remaining_balance).toLocaleString('en-IN')}`, pageWidth / 2 + 9, curY + 15);

  curY += 28;

  // Notes if any
  if (payment.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(`Payment Notes: ${payment.notes}`, 15, curY);
    curY += 8;
  }

  // Terms and conditions / Note
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Terms & Guidelines:', 15, curY);
  doc.text('1. Fees once paid are non-refundable and non-transferable under any circumstances.', 15, curY + 5);
  doc.text('2. Please carry gym shoes and a workout towel at all times on the gym floor.', 15, curY + 9);
  doc.text('3. Any remaining balance will automatically carry over to the subsequent billing cycle.', 15, curY + 13);

  // Signatures / Stamp
  const sigY = curY + 28;
  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth - 70, sigY, pageWidth - 15, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 17, 17);
  doc.text('Authorized Signatory', pageWidth - 42.5, sigY + 5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(settings.gym_name || 'MS Fitness', pageWidth - 42.5, sigY + 9, { align: 'center' });
  if (adminEmail) {
    doc.text(`Issued by: ${adminEmail}`, 15, sigY + 5);
  }

  // Footer bar
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 285, pageWidth, 12, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Thank you for choosing MS Fitness! Stronger Body, Stronger You.', pageWidth / 2, 292, { align: 'center' });

  return doc;
}

export function generateReceiptPdf(
  payment: Payment,
  member: Member | undefined,
  settings: GymSettings,
  adminEmail: string
) {
  const doc = buildReceiptPdfDocument(payment, member, settings, adminEmail);
  const filename = `${payment.receipt_number || payment.payment_id || 'Receipt'}_${member?.name?.replace(/\s+/g, '_') || 'Member'}.pdf`;
  doc.save(filename);
}

export function getReceiptPdfBase64(
  payment: Payment,
  member: Member | undefined,
  settings: GymSettings,
  adminEmail: string
): { base64: string; filename: string } {
  const doc = buildReceiptPdfDocument(payment, member, settings, adminEmail);
  const filename = `${payment.receipt_number || payment.payment_id || 'Receipt'}_${member?.name?.replace(/\s+/g, '_') || 'Member'}.pdf`;
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
  return { base64, filename };
}

export function exportReportToPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  gymSettings: GymSettings
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 25, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(gymSettings.gym_name || 'MS FITNESS', 15, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase(), 15, 19);

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 15, 16, { align: 'right' });

  // Table Headers
  let startY = 36;
  const colWidth = (pageWidth - 30) / headers.length;

  doc.setFillColor(245, 245, 245);
  doc.rect(15, startY, pageWidth - 30, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 17, 17);

  headers.forEach((h, idx) => {
    doc.text(h, 17 + idx * colWidth, startY + 5.5);
  });

  startY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  rows.forEach((row) => {
    if (startY > 190) {
      doc.addPage();
      startY = 20;
    }
    row.forEach((cell, idx) => {
      doc.setTextColor(60, 60, 60);
      doc.text(String(cell), 17 + idx * colWidth, startY);
    });
    doc.setDrawColor(240, 240, 240);
    doc.line(15, startY + 2, pageWidth - 15, startY + 2);
    startY += 7;
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
