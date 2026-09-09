import { Payment, Member, GymSettings } from '../types';
import { getReceiptPdfBase64 } from './pdfReceipt';
import { logActivity } from './db';

export interface SendReceiptEmailResult {
  success: boolean;
  message: string;
  error?: string;
  previewUrl?: string | null;
}

/**
 * Sends official payment receipt PDF via secure server-side email endpoint
 * and logs the email activity directly to the database.
 */
export async function sendReceiptEmail(
  payment: Payment,
  member: Member | undefined,
  settings: GymSettings,
  adminEmail: string
): Promise<SendReceiptEmailResult> {
  // 1. Identify customer email
  const customerEmail = (member?.email || (payment as any).member_email || '').trim();
  const customerName = member?.name || payment.member_name || 'Member';
  const memberCode = member?.member_id || payment.member_code || 'N/A';
  const receiptNum = payment.receipt_number || payment.payment_id || 'Receipt';

  // Check if customer email is missing
  if (!customerEmail || !customerEmail.includes('@')) {
    const errorMsg = 'Customer email address not found. Please update the member profile first.';
    // Log failed attempt due to missing email
    await logActivity(
      'RECEIPT_EMAIL_FAILED',
      `Receipt ${receiptNum} email failed: Customer email address not found for ${customerName} (${memberCode})`,
      adminEmail
    );
    return {
      success: false,
      message: errorMsg,
      error: errorMsg,
    };
  }

  try {
    // 2. Generate the PDF receipt base64 attachment
    const { base64, filename } = getReceiptPdfBase64(payment, member, settings, adminEmail);

    // 3. Post to secure server-side email endpoint
    const response = await fetch('/api/send-receipt-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: customerEmail,
        customerName,
        memberId: memberCode,
        planName: payment.plan_name,
        paymentAmount: payment.amount,
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        transactionNumber: payment.upi_transaction_number || payment.transaction_number,
        upiTransactionNumber: payment.upi_transaction_number || payment.transaction_number,
        receiptNumber: receiptNum,
        remainingBalance: payment.remaining_balance,
        pdfBase64: base64,
        pdfFilename: filename,
        notes: payment.notes,
        gymSettings: settings,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const err = data.error || 'Server failed to deliver receipt email';
      await logActivity(
        'RECEIPT_EMAIL_FAILED',
        `Receipt ${receiptNum} email failed for ${customerEmail} (Member ID: ${memberCode}) - Error: ${err}`,
        adminEmail
      );
      return {
        success: false,
        message: err,
        error: err,
      };
    }

    const successMessage = `Receipt sent successfully to ${customerEmail}.`;

    // Log success activity
    await logActivity(
      'RECEIPT_EMAIL_SENT',
      `Receipt ${receiptNum} sent to ${customerEmail} (Member ID: ${memberCode}) on ${new Date().toLocaleString('en-IN')} - Status: Sent`,
      adminEmail
    );

    return {
      success: true,
      message: successMessage,
      previewUrl: data.previewUrl,
    };
  } catch (err: any) {
    const errText = err.message || 'Network error sending receipt email';
    await logActivity(
      'RECEIPT_EMAIL_FAILED',
      `Receipt ${receiptNum} email failed for ${customerEmail} (Member ID: ${memberCode}) - Error: ${errText}`,
      adminEmail
    );
    return {
      success: false,
      message: errText,
      error: errText,
    };
  }
}
