const Joi = require('joi');

const idParam = { params: Joi.object({ id: Joi.number().integer().required() }) };
const paginationQuery = {
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
};

module.exports = {
  idParam,

  auth: {
    login: {
      body: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
      }),
    },
    register: {
      body: Joi.object({
        // Form ringkas: Nama, Email, Telepon, Username, Password.
        owner_name: Joi.string().max(150).required(),
        email: Joi.string().email().max(150).required(),
        phone: Joi.string().max(30).required(),
        username: Joi.string().min(3).max(100).required(),
        password: Joi.string().min(6).max(100).required(),
        // Field lain opsional (dilengkapi nanti di halaman admin via onboarding).
        store_name: Joi.string().max(150).allow('', null),
        address: Joi.string().max(500).allow('', null),
        city: Joi.string().max(100).allow('', null),
        province: Joi.string().max(100).allow('', null),
        business_category: Joi.string().max(100).allow('', null),
        password_confirmation: Joi.string().allow('', null),
      }),
    },
    verifyOtp: {
      body: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().pattern(/^\d{6}$/).required().messages({
          'string.pattern.base': 'OTP harus 6 digit angka',
        }),
      }),
    },
    resendOtp: {
      body: Joi.object({
        email: Joi.string().email().required(),
      }),
    },
    // Lupa password: minta / kirim ulang OTP (cukup email).
    forgotPassword: {
      body: Joi.object({
        email: Joi.string().email().required(),
      }),
    },
    // Reset password: email + OTP 6 digit + password baru.
    resetPassword: {
      body: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().pattern(/^\d{6}$/).required().messages({
          'string.pattern.base': 'OTP harus 6 digit angka',
        }),
        new_password: Joi.string().min(8).max(100).required().messages({
          'string.min': 'Password baru minimal 8 karakter',
        }),
      }),
    },
  },

  produk: {
    create: {
      body: Joi.object({
        nama: Joi.string().max(150).required(),
        id_kategori: Joi.number().integer().required(),
        stok: Joi.number().min(0).default(0),
        harga_beli: Joi.number().integer().min(0).required(),
        harga_jual: Joi.number().integer().min(0).required(),
        barcode: Joi.string().allow('', null),
        foto: Joi.string().allow('', null),
      }),
    },
    update: {
      params: idParam.params,
      body: Joi.object({
        nama: Joi.string().max(150),
        id_kategori: Joi.number().integer(),
        harga_beli: Joi.number().integer().min(0),
        harga_jual: Joi.number().integer().min(0),
        barcode: Joi.string().allow('', null),
        foto: Joi.string().allow('', null),
      }),
    },
    adjustStock: {
      params: idParam.params,
      body: Joi.object({
        jenis: Joi.number().valid(1, 2).required(), // 1 tambah, 2 kurang
        qty: Joi.number().positive().required(),
        keterangan: Joi.string().allow('', null),
      }),
    },
  },

  kategori: {
    upsert: { body: Joi.object({ deskripsi: Joi.string().max(150).required() }) },
  },

  supplier: {
    create: {
      body: Joi.object({
        nama: Joi.string().max(100).required(),
        alamat: Joi.string().allow('', null),
        no_telp: Joi.string().allow('', null),
        email: Joi.string().email().allow('', null),
        catatan: Joi.string().allow('', null),
        status: Joi.number().valid(0, 1).default(1),
        nama_pic: Joi.string().allow('', null),
        no_telp_pic: Joi.string().allow('', null),
      }),
    },
    update: {
      params: idParam.params,
      body: Joi.object({
        nama: Joi.string().max(100),
        alamat: Joi.string().allow('', null),
        no_telp: Joi.string().allow('', null),
        email: Joi.string().email().allow('', null),
        catatan: Joi.string().allow('', null),
        status: Joi.number().valid(0, 1),
        nama_pic: Joi.string().allow('', null),
        no_telp_pic: Joi.string().allow('', null),
      }).min(1),
    },
  },

  jenisBayar: {
    upsert: { body: Joi.object({ nama: Joi.string().max(100).required() }) },
  },

  identitas: {
    update: {
      body: Joi.object({
        nama: Joi.string().allow('', null),
        alamat: Joi.string().allow('', null),
        no_telp: Joi.string().allow('', null),
        email: Joi.string().allow('', null),
        website: Joi.string().allow('', null),
        logo: Joi.string().allow('', null),
      }).min(1),
    },
  },

  qris: {
    update: {
      // Dikirim sebagai multipart/form-data (gambar opsional + field teks).
      body: Joi.object({
        merchant_name: Joi.string().max(150).allow('', null),
        nmid: Joi.string().max(50).allow('', null),
        // is_active dari form bisa berupa "true"/"false" atau "1"/"0".
        is_active: Joi.boolean().truthy('1', 'true').falsy('0', 'false'),
        image: Joi.string().allow('', null),
      }).min(1),
    },
  },

  pengguna: {
    create: {
      body: Joi.object({
        nama: Joi.string().max(100).required(),
        username: Joi.string().max(100).required(),
        password: Joi.string().required(),
        level: Joi.number().valid(2, 3).required(), // 2 kasir, 3 gudang (admin merchant hanya boleh buat ini)
        telp: Joi.string().allow('', null),
      }),
    },
    update: {
      params: idParam.params,
      body: Joi.object({
        nama: Joi.string().max(100),
        username: Joi.string().max(100),
        level: Joi.number().valid(2, 3),
        telp: Joi.string().allow('', null),
      }).min(1),
    },
    changePassword: {
      params: idParam.params,
      body: Joi.object({
        old_password: Joi.string().required(),
        new_password: Joi.string().required(),
      }),
    },
  },

  penjualan: {
    list: {
      query: Joi.object({
        tanggal_awal: Joi.date().iso(),
        tanggal_akhir: Joi.date().iso(),
        id_user: Joi.number().integer(),
        id_jenis_bayar: Joi.number().integer(),
        status: Joi.number().valid(0, 1),
        ...paginationQuery,
      }),
    },
    checkout: {
      body: Joi.object({
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
          diskon: Joi.number().min(0).default(0), // diskon per item (nominal, dinonaktifkan)
          modifier_option_ids: Joi.array().items(Joi.number().integer()).default([]),
        })).min(1).required(),
        id_jenis_bayar: Joi.number().integer().required(),
        id_user: Joi.number().integer().required(),
        bayar: Joi.number().min(0),
        keterangan: Joi.string().allow('', null),
        diskon: Joi.number().min(0).default(0),
        kode_voucher: Joi.string().allow('', null),
      }),
    },
  },

  // Payment gateway (Midtrans QRIS dinamis) - khusus BUSINESS.
  payment: {
    createQris: {
      body: Joi.object({
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
          modifier_option_ids: Joi.array().items(Joi.number().integer()).default([]),
        })).min(1).required(),
        id_jenis_bayar: Joi.number().integer().required(),
        id_user: Joi.number().integer().required(),
        diskon: Joi.number().min(0).default(0),
        keterangan: Joi.string().allow('', null),
        kode_voucher: Joi.string().allow('', null),
        customer_name: Joi.string().max(80).allow('', null),
      }),
    },
    status: {
      params: Joi.object({ transaction_id: Joi.number().integer().required() }),
    },
    // Webhook Midtrans: payload bebas (banyak field), jangan diketat-ketat agar
    // tidak menolak notifikasi sah. Validasi keamanan via signature di service.
    notification: {
      body: Joi.object().unknown(true),
    },
  },

  tax: {
    update: {
      body: Joi.object({
        ppn_enabled: Joi.boolean(),
        ppn_persen: Joi.number().min(0).max(100),
        service_enabled: Joi.boolean(),
        service_persen: Joi.number().min(0).max(100),
      }).min(1),
    },
  },

  voucher: {
    create: {
      body: Joi.object({
        kode: Joi.string().max(50).required(),
        tipe: Joi.string().valid('NOMINAL', 'PERSEN').required(),
        nilai: Joi.number().min(0).required(),
        min_transaksi: Joi.number().min(0).default(0),
        valid_from: Joi.date().iso().allow(null, ''),
        valid_until: Joi.date().iso().allow(null, ''),
        is_active: Joi.boolean().default(true),
      }),
    },
    update: {
      params: idParam.params,
      body: Joi.object({
        kode: Joi.string().max(50),
        tipe: Joi.string().valid('NOMINAL', 'PERSEN'),
        nilai: Joi.number().min(0),
        min_transaksi: Joi.number().min(0),
        valid_from: Joi.date().iso().allow(null, ''),
        valid_until: Joi.date().iso().allow(null, ''),
        is_active: Joi.boolean(),
      }).min(1),
    },
  },

  subscription: {
    setting: {
      body: Joi.object({
        price_monthly: Joi.number().integer().min(0),
        price_3_months: Joi.number().integer().min(0),
        price_6_months: Joi.number().integer().min(0),
        price_yearly: Joi.number().integer().min(0),
        price_business_monthly: Joi.number().integer().min(0),
        price_business_yearly: Joi.number().integer().min(0),
        payment_ttl_hours: Joi.number().integer().min(1).max(168),
        maintenance_mode: Joi.boolean(),
        maintenance_message: Joi.string().allow('', null),
      }).min(1),
    },
    create: {
      body: Joi.object({
        plan: Joi.string().valid('PRO', 'BUSINESS').required(),
        paket: Joi.string().valid('BULANAN', '3_BULAN', '6_BULAN', 'TAHUNAN').required(),
      }),
    },
    status: {
      params: idParam.params,
    },
    revenue: {
      query: Joi.object({
        tanggal_awal: Joi.date().iso(),
        tanggal_akhir: Joi.date().iso(),
      }),
    },
    revenueChart: {
      query: Joi.object({
        tahun: Joi.number().integer().min(2000).max(2100),
      }),
    },
  },

  openBill: {
    list: {
      query: Joi.object({
        status: Joi.string().valid('OPEN', 'PAID', 'CANCELLED'),
        search: Joi.string().allow('', null),
        ...paginationQuery,
      }),
    },
    create: {
      body: Joi.object({
        customer_name: Joi.string().max(150).allow('', null),
        table_no: Joi.string().max(30).allow('', null),
        note: Joi.string().allow('', null),
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
          note: Joi.string().max(255).allow('', null),
          modifier_option_ids: Joi.array().items(Joi.number().integer()).default([]),
        })).min(1).required(),
      }),
    },
    update: {
      params: idParam.params,
      body: Joi.object({
        customer_name: Joi.string().max(150).allow('', null),
        table_no: Joi.string().max(30).allow('', null),
        note: Joi.string().allow('', null),
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
          note: Joi.string().max(255).allow('', null),
          modifier_option_ids: Joi.array().items(Joi.number().integer()).default([]),
        })).min(1),
      }).min(1),
    },
    pay: {
      params: idParam.params,
      body: Joi.object({
        id_jenis_bayar: Joi.number().integer().required(),
        bayar: Joi.number().min(0),
        diskon: Joi.number().min(0).default(0),
        keterangan: Joi.string().allow('', null),
      }),
    },
    payPartial: {
      params: idParam.params,
      body: Joi.object({
        payer_name: Joi.string().max(150).allow('', null),
        items: Joi.array().items(Joi.object({
          id_open_bill_detail: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
        })).min(1).required(),
        id_jenis_bayar: Joi.number().integer().required(),
        bayar: Joi.number().min(0),
        diskon: Joi.number().min(0).default(0),
        keterangan: Joi.string().allow('', null),
      }),
    },
    payPartialQris: {
      params: idParam.params,
      body: Joi.object({
        payer_name: Joi.string().max(150).allow('', null),
        items: Joi.array().items(Joi.object({
          id_open_bill_detail: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
        })).min(1).required(),
        id_jenis_bayar: Joi.number().integer().required(),
        diskon: Joi.number().min(0).default(0),
        keterangan: Joi.string().allow('', null),
        customer_name: Joi.string().max(80).allow('', null),
      }),
    },
  },

  kasShift: {
    list: {
      query: Joi.object({
        status: Joi.string().valid('OPEN', 'CLOSED'),
        id_user: Joi.number().integer(),
        tanggal_awal: Joi.date().iso(),
        tanggal_akhir: Joi.date().iso(),
      }),
    },
    open: {
      body: Joi.object({
        modal_awal: Joi.number().min(0).default(0),
        station: Joi.string().max(50).allow('', null),
        catatan: Joi.string().allow('', null),
      }),
    },
    mutasi: {
      params: idParam.params,
      body: Joi.object({
        tipe: Joi.string().valid('IN', 'OUT').required(),
        nominal: Joi.number().positive().required(),
        keterangan: Joi.string().max(255).allow('', null),
      }),
    },
    close: {
      params: idParam.params,
      body: Joi.object({
        actual_cash: Joi.number().min(0).required(),
        actual_methods: Joi.array().items(Joi.object({
          id_jenis_bayar: Joi.number().integer().required(),
          actual: Joi.number().min(0).required(),
        })).default([]),
        catatan: Joi.string().allow('', null),
      }),
    },
    reportDaily: {
      query: Joi.object({
        tanggal: Joi.date().iso().required(),
      }),
    },
  },

  modifier: {
    group: {
      body: Joi.object({
        nama: Joi.string().max(100).required(),
        tipe: Joi.string().valid('SINGLE', 'MULTI').default('SINGLE'),
        wajib: Joi.boolean().default(false),
      }),
    },
    option: {
      body: Joi.object({
        nama: Joi.string().max(100).required(),
        harga: Joi.number().integer().min(0).default(0),
      }),
    },
    setProduct: {
      params: idParam.params,
      body: Joi.object({ group_ids: Joi.array().items(Joi.number().integer()).default([]) }),
    },
  },

  meja: {
    create: { body: Joi.object({ nomor: Joi.string().max(50).required() }) },
    update: {
      params: idParam.params,
      body: Joi.object({ nomor: Joi.string().max(50), is_active: Joi.boolean() }).min(1),
    },
  },

  public: {
    order: {
      params: Joi.object({ token: Joi.string().required() }),
      body: Joi.object({
        customer_name: Joi.string().max(150).allow('', null),
        note: Joi.string().max(255).allow('', null),
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
        })).min(1).required(),
      }),
    },
  },

  pembelian: {
    create: {
      body: Joi.object({
        no_nota: Joi.string().max(50).required(),
        tanggal: Joi.date().iso().required(),
        id_supplier: Joi.number().integer().allow(null),
        catatan: Joi.string().allow('', null),
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          harga_beli: Joi.number().integer().min(0).required(),
          qty: Joi.number().positive().required(),
        })).min(1).required(),
      }),
    },
    update: {
      params: idParam.params,
      body: Joi.object({
        no_nota: Joi.string().max(50),
        tanggal: Joi.date().iso(),
        id_supplier: Joi.number().integer().allow(null),
        catatan: Joi.string().allow('', null),
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          harga_beli: Joi.number().integer().min(0).required(),
          qty: Joi.number().positive().required(),
        })).min(1).required(),
      }),
    },
  },

  retur: {
    create: {
      body: Joi.object({
        no_nota: Joi.string().max(50).required(),
        tanggal: Joi.date().iso().required(),
        id_supplier: Joi.number().integer().allow(null),
        id_pembelian: Joi.number().integer().allow(null),
        catatan: Joi.string().allow('', null),
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
          alasan: Joi.string().max(150).allow('', null),
          kondisi: Joi.string().max(50).allow('', null),
          harga: Joi.number().integer().min(0).allow(null),
          keterangan: Joi.string().allow('', null),
        })).min(1).required(),
      }),
    },
    update: {
      params: idParam.params,
      body: Joi.object({
        no_nota: Joi.string().max(50),
        tanggal: Joi.date().iso(),
        id_supplier: Joi.number().integer().allow(null),
        id_pembelian: Joi.number().integer().allow(null),
        catatan: Joi.string().allow('', null),
        items: Joi.array().items(Joi.object({
          id_produk: Joi.number().integer().required(),
          qty: Joi.number().positive().required(),
          alasan: Joi.string().max(150).allow('', null),
          kondisi: Joi.string().max(50).allow('', null),
          harga: Joi.number().integer().min(0).allow(null),
          keterangan: Joi.string().allow('', null),
        })).min(1).required(),
      }),
    },
  },

  penyusutan: {
    create: {
      params: idParam.params,
      body: Joi.object({
        harga_jual_awal: Joi.number().integer().min(0),
        harga_jual_akhir: Joi.number().integer().min(0).required(),
        prosentase: Joi.number().integer(),
      }),
    },
  },

  transaksi: {
    list: {
      query: Joi.object({
        tanggal: Joi.date().iso(),
        tanggal_awal: Joi.date().iso(),
        tanggal_akhir: Joi.date().iso(),
      }),
    },
    create: {
      body: Joi.object({
        nama: Joi.string().required(),
        jenis: Joi.string().valid('M', 'K').required(), // M masuk, K keluar
        nominal: Joi.number().required(),
        tanggal: Joi.date().iso().required(),
      }),
    },
  },

  laporan: {
    penjualan: {
      query: Joi.object({
        tanggal_awal: Joi.date().iso().required(),
        tanggal_akhir: Joi.date().iso().required(),
        id_user: Joi.alternatives(Joi.number().integer(), Joi.string().valid('all')).default('all'),
        id_jenis_bayar: Joi.number().integer(),
        id_shift: Joi.number().integer(),
        status: Joi.number().valid(0, 1).default(1),
        ...paginationQuery,
      }),
    },
    pendapatan: {
      query: Joi.object({
        tanggal_awal: Joi.date().iso().required(),
        tanggal_akhir: Joi.date().iso().required(),
        status: Joi.number().valid(0, 1).default(1),
      }),
    },
    rekap: {
      query: Joi.object({
        tanggal_awal: Joi.date().iso().required(),
        tanggal_akhir: Joi.date().iso().required(),
        status: Joi.number().valid(0, 1).default(1),
        top_limit: Joi.number().integer().min(1).max(100).default(10),
      }),
    },
  },

  dashboard: {
    chart: { query: Joi.object({ tahun: Joi.number().integer().min(2000).max(2100).required() }) },
  },

  // Akun sendiri: ubah password & ganti email (OTP).
  account: {
    changePassword: {
      body: Joi.object({
        old_password: Joi.string().required(),
        new_password: Joi.string().min(6).max(100).required().messages({
          'string.min': 'Password baru minimal 6 karakter',
        }),
      }),
    },
    emailRequest: {
      body: Joi.object({
        password: Joi.string().required(),
        new_email: Joi.string().email().max(150).required(),
      }),
    },
    emailVerify: {
      body: Joi.object({
        otp: Joi.string().pattern(/^\d{6}$/).required().messages({
          'string.pattern.base': 'OTP harus 6 digit angka',
        }),
      }),
    },
  },

  // Super admin: set plan merchant manual (FREE/PRO/BUSINESS + masa aktif + catatan).
  merchant: {
    setPlan: {
      params: idParam.params,
      body: Joi.object({
        plan: Joi.string().valid('FREE', 'PRO', 'BUSINESS').required(),
        pro_starts_at: Joi.date().iso().allow(null, ''),
        pro_expires_at: Joi.date().iso().allow(null, ''),
        note: Joi.string().max(255).allow('', null),
      }),
    },
  },
};
