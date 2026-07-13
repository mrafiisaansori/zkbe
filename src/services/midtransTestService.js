const billingMidtrans = require('./billingMidtransService');

// Alat internal superadmin - BUKAN fitur bisnis. Charge GoPay Rp1 LANGSUNG lewat
// Core API (bukan Snap) pakai akun Midtrans BILLING (sama yang dipakai upgrade
// plan), supaya QR-nya bisa langsung dicek: kalau qr_string ikut standar QRIS
// (bisa discan app apa aja), GoPay QRIS Aggregator sudah aktif.
//
// order_id sengaja pakai prefix "ZKBTEST-" (bukan "ZKB-<id>-<id>-<ts>" seperti
// pembayaran langganan asli) - format ini TIDAK match regex parseOrderId di
// subscriptionService, jadi kalaupun webhook Midtrans kirim notifikasi buat
// transaksi test ini, langsung ditolak (400) sebelum sempat nyentuh tabel
// SubscriptionPayment manapun. Nggak perlu dicatat ke DB sama sekali.
async function chargeGopayQrisTest() {
  const orderId = `ZKBTEST-${Date.now()}`;
  const result = await billingMidtrans.chargeGopayQris({ orderId, grossAmount: 1 });
  return {
    order_id: result.orderId,
    transaction_status: result.transactionStatus,
    qr_image_url: result.qrImageUrl,
    qr_string: result.qrString,
    // Respons mentah Midtrans - buat diagnosa kalau qr_image_url/qr_string kosong
    // (mis. actions[] nggak ada generate-qr-code, atau status_message ngasih tau kenapa).
    raw: result.raw,
  };
}

module.exports = { chargeGopayQrisTest };
