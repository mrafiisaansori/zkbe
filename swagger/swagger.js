const bearer = [{ bearerAuth: [] }];

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });

const idParam = (description = 'ID data') => ({
  in: 'path',
  name: 'id',
  required: true,
  schema: { type: 'integer' },
  description,
});

const pathParam = (name, schema = { type: 'string' }, description = '') => ({
  in: 'path',
  name,
  required: true,
  schema,
  description,
});

const queryParam = (name, schema = { type: 'string' }, description = '', required = false) => ({
  in: 'query',
  name,
  required,
  schema,
  description,
});

const paginationParams = [
  queryParam('page', { type: 'integer', minimum: 1 }, 'Nomor halaman. Jika tidak dikirim, response tidak dipaginasi.'),
  queryParam('limit', { type: 'integer', minimum: 1, maximum: 100 }, 'Jumlah data per halaman.'),
];

const dateRangeParams = [
  queryParam('tanggal_awal', { type: 'string', format: 'date' }, 'Tanggal awal, format YYYY-MM-DD.'),
  queryParam('tanggal_akhir', { type: 'string', format: 'date' }, 'Tanggal akhir, format YYYY-MM-DD.'),
];

const jsonBody = (schema, required = true) => ({
  required,
  content: {
    'application/json': { schema },
  },
});

const multipartBody = (schema, required = true) => ({
  required,
  content: {
    'multipart/form-data': { schema },
  },
});

const mixedBody = (schema, multipartSchema = schema, required = true) => ({
  required,
  content: {
    'application/json': { schema },
    'multipart/form-data': { schema: multipartSchema },
  },
});

const apiResponse = (description = 'OK', dataSchema = { nullable: true }, example) => {
  const content = {
    'application/json': {
      schema: {
        allOf: [
          ref('ApiResponse'),
          { type: 'object', properties: { data: dataSchema } },
        ],
      },
    },
  };
  if (example !== undefined) content['application/json'].example = example;
  return { description, content };
};

const createdResponse = (description = 'Data berhasil dibuat', dataSchema = { nullable: true }, example) =>
  apiResponse(description, dataSchema, example);

const deletedResponse = (description = 'Data dihapus') =>
  apiResponse(description, { nullable: true }, { success: true, message: description, data: null });

const fileResponse = (description, contentType) => ({
  description,
  content: {
    [contentType]: { schema: { type: 'string', format: 'binary' } },
  },
});

const webhookResponse = {
  description: 'Notifikasi diterima.',
  content: {
    'application/json': {
      schema: ref('WebhookResponse'),
      example: { success: true, order_id: 'ZK-1-10-1783471143474', payment_status: 'PAID' },
    },
  },
};

const withErrors = (responses, {
  auth = true, forbidden = true, validation = true, notFound = false, conflict = false,
} = {}) => ({
  ...responses,
  ...(auth ? { 401: responseRef('Unauthorized') } : {}),
  ...(forbidden ? { 403: responseRef('Forbidden') } : {}),
  ...(validation ? { 422: responseRef('ValidationError') } : {}),
  ...(notFound ? { 404: responseRef('NotFound') } : {}),
  ...(conflict ? { 409: responseRef('Conflict') } : {}),
  500: responseRef('ServerError'),
});

const op = ({
  tags, summary, description, security = bearer, parameters, requestBody, responses,
}) => ({
  tags,
  summary,
  ...(description ? { description } : {}),
  security,
  ...(parameters ? { parameters } : {}),
  ...(requestBody ? { requestBody } : {}),
  responses,
});

const schemas = {
  ApiResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: { nullable: true, description: 'Payload response. Bentuk data mengikuti endpoint.' },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
    required: ['success', 'message', 'data'],
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Validasi gagal' },
      details: {
        type: 'array',
        nullable: true,
        items: { type: 'string' },
        example: ['"nama" is required'],
      },
    },
    required: ['success', 'message'],
  },
  PaginationMeta: {
    type: 'object',
    nullable: true,
    properties: {
      total: { type: 'integer', example: 128 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total_pages: { type: 'integer', example: 7 },
    },
  },
  WebhookResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      order_id: { type: 'string', example: 'ZK-1-10-1783471143474' },
      payment_status: { type: 'string', enum: ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED'], example: 'PAID' },
    },
    required: ['success', 'order_id', 'payment_status'],
  },

  LoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', example: 'admin' },
      password: { type: 'string', format: 'password', example: 'secret123' },
    },
  },
  RegisterRequest: {
    type: 'object',
    required: ['owner_name', 'email', 'phone', 'username', 'password'],
    properties: {
      owner_name: { type: 'string', maxLength: 150, example: 'Rafi' },
      email: { type: 'string', format: 'email', maxLength: 150, example: 'rafi@example.com' },
      phone: { type: 'string', maxLength: 30, example: '+6281234567890' },
      username: { type: 'string', minLength: 3, maxLength: 100, example: 'rafiadmin' },
      password: { type: 'string', minLength: 6, maxLength: 100, format: 'password', example: 'secret123' },
      store_name: { type: 'string', nullable: true, maxLength: 150, example: 'Kedai Rafi' },
      address: { type: 'string', nullable: true, maxLength: 500, example: 'Jl. Mawar No. 1' },
      city: { type: 'string', nullable: true, maxLength: 100, example: 'Jakarta' },
      province: { type: 'string', nullable: true, maxLength: 100, example: 'DKI Jakarta' },
      business_category: { type: 'string', nullable: true, maxLength: 100, example: 'F&B' },
      password_confirmation: { type: 'string', nullable: true, format: 'password', example: 'secret123' },
    },
  },
  VerifyOtpRequest: {
    type: 'object',
    required: ['email', 'otp'],
    properties: {
      email: { type: 'string', format: 'email', example: 'rafi@example.com' },
      otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
    },
  },
  EmailOnlyRequest: {
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email', example: 'rafi@example.com' } },
  },
  ResetPasswordRequest: {
    type: 'object',
    required: ['email', 'otp', 'new_password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'rafi@example.com' },
      otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
      new_password: { type: 'string', minLength: 8, maxLength: 100, format: 'password', example: 'newsecret123' },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['old_password', 'new_password'],
    properties: {
      old_password: { type: 'string', format: 'password', example: 'oldsecret' },
      new_password: { type: 'string', minLength: 6, maxLength: 100, format: 'password', example: 'newsecret' },
    },
  },
  EmailChangeRequest: {
    type: 'object',
    required: ['password', 'new_email'],
    properties: {
      password: { type: 'string', format: 'password', example: 'secret123' },
      new_email: { type: 'string', format: 'email', maxLength: 150, example: 'new@example.com' },
    },
  },
  EmailVerifyRequest: {
    type: 'object',
    required: ['otp'],
    properties: { otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' } },
  },

  MerchantUpdateRequest: {
    type: 'object',
    properties: {
      store_name: { type: 'string', example: 'Kedai Rafi' },
      nama: { type: 'string', description: 'Alias store_name.', example: 'Kedai Rafi' },
      owner_name: { type: 'string', example: 'Rafi' },
      phone: { type: 'string', example: '+6281234567890' },
      address: { type: 'string', example: 'Jl. Mawar No. 1' },
      city: { type: 'string', example: 'Jakarta' },
      province: { type: 'string', example: 'DKI Jakarta' },
      business_category: { type: 'string', example: 'F&B' },
      invoice_prefix: { type: 'string', description: 'Prefix nomor nota unik per merchant.', example: 'KDR' },
      slug: { type: 'string', description: 'Slug katalog publik.', example: 'kedai-rafi' },
    },
  },
  MerchantStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['active', 'suspended', 'pending'], example: 'active' },
    },
  },
  MerchantPlanRequest: {
    type: 'object',
    required: ['plan'],
    properties: {
      plan: { type: 'string', enum: ['FREE', 'PRO', 'BUSINESS'], example: 'PRO' },
      pro_starts_at: { type: 'string', format: 'date-time', nullable: true },
      pro_expires_at: { type: 'string', format: 'date-time', nullable: true },
      note: { type: 'string', nullable: true, maxLength: 255, example: 'Aktivasi manual' },
    },
  },

  ProdukCreateRequest: {
    type: 'object',
    required: ['nama', 'id_kategori', 'harga_beli', 'harga_jual'],
    properties: {
      nama: { type: 'string', maxLength: 150, example: 'Kopi Susu' },
      id_kategori: { type: 'integer', example: 1 },
      stok: { type: 'number', minimum: 0, default: 0, example: 20 },
      harga_beli: { type: 'integer', minimum: 0, example: 9000 },
      harga_jual: { type: 'integer', minimum: 0, example: 18000 },
      barcode: { type: 'string', nullable: true, example: '8990001234' },
      foto: { type: 'string', nullable: true, description: 'Hanya untuk application/json. Multipart memakai file binary.' },
    },
  },
  ProdukUpdateRequest: {
    type: 'object',
    properties: {
      nama: { type: 'string', maxLength: 150 },
      id_kategori: { type: 'integer' },
      harga_beli: { type: 'integer', minimum: 0 },
      harga_jual: { type: 'integer', minimum: 0 },
      barcode: { type: 'string', nullable: true },
      foto: { type: 'string', nullable: true, description: 'Hanya untuk application/json. Multipart memakai file binary.' },
    },
  },
  ProdukCreateMultipartRequest: {
    allOf: [
      ref('ProdukCreateRequest'),
      {
        type: 'object',
        properties: {
          foto: { type: 'string', format: 'binary', description: 'Gambar produk jpg/jpeg/png/webp, maksimal 2MB.' },
        },
      },
    ],
  },
  ProdukUpdateMultipartRequest: {
    allOf: [
      ref('ProdukUpdateRequest'),
      {
        type: 'object',
        properties: {
          foto: { type: 'string', format: 'binary', description: 'Gambar produk baru jpg/jpeg/png/webp, maksimal 2MB.' },
        },
      },
    ],
  },
  ProdukImportRequest: {
    type: 'object',
    required: ['file'],
    properties: {
      file: { type: 'string', format: 'binary', description: 'File .xlsx, .xls, atau .csv. Maksimal 5MB.' },
    },
  },
  StockAdjustRequest: {
    type: 'object',
    required: ['jenis', 'qty'],
    properties: {
      jenis: { type: 'integer', enum: [1, 2], description: '1=tambah stok, 2=kurang stok.', example: 1 },
      qty: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 5 },
      keterangan: { type: 'string', nullable: true, example: 'Penyesuaian opname' },
    },
  },
  KategoriRequest: {
    type: 'object',
    required: ['deskripsi'],
    properties: { deskripsi: { type: 'string', maxLength: 150, example: 'Minuman' } },
  },
  SupplierCreateRequest: {
    type: 'object',
    required: ['nama'],
    properties: {
      nama: { type: 'string', maxLength: 100, example: 'PT Sumber Makmur' },
      alamat: { type: 'string', nullable: true },
      no_telp: { type: 'string', nullable: true },
      email: { type: 'string', format: 'email', nullable: true },
      catatan: { type: 'string', nullable: true },
      status: { type: 'integer', enum: [0, 1], default: 1 },
      nama_pic: { type: 'string', nullable: true },
      no_telp_pic: { type: 'string', nullable: true },
    },
  },
  SupplierUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      nama: { type: 'string', maxLength: 100 },
      alamat: { type: 'string', nullable: true },
      no_telp: { type: 'string', nullable: true },
      email: { type: 'string', format: 'email', nullable: true },
      catatan: { type: 'string', nullable: true },
      status: { type: 'integer', enum: [0, 1] },
      nama_pic: { type: 'string', nullable: true },
      no_telp_pic: { type: 'string', nullable: true },
    },
  },
  JenisBayarRequest: {
    type: 'object',
    required: ['nama'],
    properties: { nama: { type: 'string', maxLength: 100, example: 'Cash' } },
  },
  IdentitasUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      nama: { type: 'string', nullable: true },
      alamat: { type: 'string', nullable: true },
      no_telp: { type: 'string', nullable: true },
      email: { type: 'string', nullable: true },
      website: { type: 'string', nullable: true },
      logo: { type: 'string', nullable: true },
    },
  },
  ImageUploadRequest: {
    type: 'object',
    required: ['image'],
    properties: { image: { type: 'string', format: 'binary', description: 'File jpg/jpeg/png/webp, maksimal 2MB.' } },
  },
  BannerUploadRequest: {
    type: 'object',
    required: ['banner'],
    properties: { banner: { type: 'string', format: 'binary', description: 'File jpg/jpeg/png/webp, maksimal 2MB.' } },
  },
  LogoUploadRequest: {
    type: 'object',
    required: ['logo'],
    properties: { logo: { type: 'string', format: 'binary', description: 'File jpg/jpeg/png/webp, maksimal 2MB.' } },
  },
  QrisUpdateMultipartRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      merchant_name: { type: 'string', maxLength: 150, nullable: true, example: 'Kedai Rafi' },
      nmid: { type: 'string', maxLength: 50, nullable: true },
      is_active: { type: 'boolean', description: 'Form juga menerima 1/0 atau true/false string.' },
      image: { type: 'string', format: 'binary', description: 'Gambar QRIS statis jpg/jpeg/png/webp, maksimal 2MB.' },
    },
  },

  PenggunaCreateRequest: {
    type: 'object',
    required: ['nama', 'username', 'password', 'level'],
    properties: {
      nama: { type: 'string', maxLength: 100, example: 'Kasir 1' },
      username: { type: 'string', maxLength: 100, example: 'kasir1' },
      password: { type: 'string', format: 'password', example: 'secret123' },
      level: { type: 'integer', enum: [2, 3], description: '2=kasir, 3=gudang.', example: 2 },
      telp: { type: 'string', nullable: true },
    },
  },
  PenggunaUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      nama: { type: 'string', maxLength: 100 },
      username: { type: 'string', maxLength: 100 },
      level: { type: 'integer', enum: [2, 3] },
      telp: { type: 'string', nullable: true },
    },
  },

  SaleItem: {
    type: 'object',
    required: ['id_produk', 'qty'],
    properties: {
      id_produk: { type: 'integer', example: 1 },
      qty: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 2 },
      diskon: { type: 'number', minimum: 0, default: 0, description: 'Diskon per item saat ini dinonaktifkan di service.' },
      modifier_option_ids: { type: 'array', items: { type: 'integer' }, default: [] },
    },
  },
  CheckoutRequest: {
    type: 'object',
    required: ['items', 'id_jenis_bayar', 'id_user'],
    properties: {
      items: { type: 'array', minItems: 1, items: ref('SaleItem') },
      id_jenis_bayar: { type: 'integer', example: 1 },
      id_user: { type: 'integer', example: 2 },
      bayar: { type: 'number', minimum: 0, example: 50000 },
      keterangan: { type: 'string', nullable: true },
      diskon: { type: 'number', minimum: 0, default: 0 },
      kode_voucher: { type: 'string', nullable: true },
    },
  },
  PaymentQrisRequest: {
    type: 'object',
    required: ['items', 'id_jenis_bayar', 'id_user'],
    properties: {
      items: { type: 'array', minItems: 1, items: ref('SaleItem') },
      id_jenis_bayar: { type: 'integer', example: 2 },
      id_user: { type: 'integer', example: 2 },
      diskon: { type: 'number', minimum: 0, default: 0 },
      keterangan: { type: 'string', nullable: true },
      kode_voucher: { type: 'string', nullable: true },
      customer_name: { type: 'string', maxLength: 80, nullable: true, example: 'Rafi' },
    },
  },
  QrisPaymentData: {
    type: 'object',
    description: 'Hasil pembuatan transaksi Midtrans Snap. Frontend memuat Snap.js dengan client_key/is_production lalu memanggil window.snap.pay(snap_token).',
    properties: {
      transaction_id: { type: 'integer', example: 10 },
      no_nota: { type: 'string', example: 'ZK-000010' },
      order_id: { type: 'string', example: 'ZK-1-10-1783471143474' },
      provider: { type: 'string', example: 'midtrans' },
      payment_status: { type: 'string', example: 'PENDING' },
      gross_amount: { type: 'number', example: 25000 },
      snap_token: { type: 'string', description: 'Token untuk window.snap.pay() / window.snap.embed() di frontend.' },
      redirect_url: { type: 'string', nullable: true, format: 'uri', description: 'Alternatif: redirect penuh ke halaman Snap tanpa popup.' },
      client_key: { type: 'string', description: 'Client key Midtrans (publik) untuk memuat Snap.js.' },
      is_production: { type: 'boolean' },
      expiry_minutes: { type: 'integer', example: 30 },
    },
  },
  MidtransNotification: {
    type: 'object',
    description: 'Payload webhook Midtrans bersifat fleksibel. Field tambahan akan diabaikan oleh validator.',
    additionalProperties: true,
    properties: {
      order_id: { type: 'string', example: 'ZK-1-10-1783471143474' },
      status_code: { type: 'string', example: '200' },
      gross_amount: { type: 'string', example: '25000.00' },
      signature_key: { type: 'string' },
      transaction_status: { type: 'string', example: 'settlement' },
      fraud_status: { type: 'string', example: 'accept' },
      transaction_id: { type: 'string' },
    },
  },

  OpenBillItem: {
    type: 'object',
    required: ['id_produk', 'qty'],
    properties: {
      id_produk: { type: 'integer', example: 1 },
      qty: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 2 },
      note: { type: 'string', maxLength: 255, nullable: true },
      modifier_option_ids: { type: 'array', items: { type: 'integer' }, default: [] },
    },
  },
  OpenBillCreateRequest: {
    type: 'object',
    required: ['items'],
    properties: {
      customer_name: { type: 'string', maxLength: 150, nullable: true, example: 'Meja A' },
      table_no: { type: 'string', maxLength: 30, nullable: true, example: 'A1' },
      note: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: ref('OpenBillItem') },
    },
  },
  OpenBillUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      customer_name: { type: 'string', maxLength: 150, nullable: true },
      table_no: { type: 'string', maxLength: 30, nullable: true },
      note: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: ref('OpenBillItem') },
    },
  },
  OpenBillPayRequest: {
    type: 'object',
    required: ['id_jenis_bayar'],
    properties: {
      id_jenis_bayar: { type: 'integer', example: 1 },
      bayar: { type: 'number', minimum: 0, example: 50000 },
      diskon: { type: 'number', minimum: 0, default: 0 },
      keterangan: { type: 'string', nullable: true },
    },
  },
  OpenBillPartialItem: {
    type: 'object',
    required: ['id_open_bill_detail', 'qty'],
    properties: {
      id_open_bill_detail: { type: 'integer', example: 11 },
      qty: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 1 },
    },
  },
  OpenBillPartialPayRequest: {
    type: 'object',
    required: ['items', 'id_jenis_bayar'],
    properties: {
      payer_name: { type: 'string', maxLength: 150, nullable: true, example: 'Orang 1' },
      items: { type: 'array', minItems: 1, items: ref('OpenBillPartialItem') },
      id_jenis_bayar: { type: 'integer', example: 1 },
      bayar: { type: 'number', minimum: 0, example: 25000 },
      diskon: { type: 'number', minimum: 0, default: 0 },
      keterangan: { type: 'string', nullable: true },
    },
  },
  OpenBillPartialQrisRequest: {
    type: 'object',
    required: ['items', 'id_jenis_bayar'],
    properties: {
      payer_name: { type: 'string', maxLength: 150, nullable: true, example: 'Orang 1' },
      items: { type: 'array', minItems: 1, items: ref('OpenBillPartialItem') },
      id_jenis_bayar: { type: 'integer', example: 2 },
      diskon: { type: 'number', minimum: 0, default: 0 },
      keterangan: { type: 'string', nullable: true },
      customer_name: { type: 'string', maxLength: 80, nullable: true },
    },
  },

  KasShiftOpenRequest: {
    type: 'object',
    properties: {
      modal_awal: { type: 'number', minimum: 0, default: 0, example: 200000 },
      station: { type: 'string', maxLength: 50, nullable: true, example: 'Kasir 1' },
      catatan: { type: 'string', nullable: true },
    },
  },
  KasMutasiRequest: {
    type: 'object',
    required: ['tipe', 'nominal'],
    properties: {
      tipe: { type: 'string', enum: ['IN', 'OUT'], example: 'IN' },
      nominal: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 50000 },
      keterangan: { type: 'string', maxLength: 255, nullable: true },
    },
  },
  KasShiftCloseRequest: {
    type: 'object',
    required: ['actual_cash'],
    properties: {
      actual_cash: { type: 'number', minimum: 0, example: 450000 },
      actual_methods: {
        type: 'array',
        default: [],
        items: {
          type: 'object',
          required: ['id_jenis_bayar', 'actual'],
          properties: {
            id_jenis_bayar: { type: 'integer', example: 2 },
            actual: { type: 'number', minimum: 0, example: 150000 },
          },
        },
      },
      catatan: { type: 'string', nullable: true },
    },
  },

  TaxUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      ppn_enabled: { type: 'boolean' },
      ppn_persen: { type: 'number', minimum: 0, maximum: 100 },
      service_enabled: { type: 'boolean' },
      service_persen: { type: 'number', minimum: 0, maximum: 100 },
    },
  },
  VoucherCreateRequest: {
    type: 'object',
    required: ['kode', 'tipe', 'nilai'],
    properties: {
      kode: { type: 'string', maxLength: 50, example: 'HEMAT10' },
      tipe: { type: 'string', enum: ['NOMINAL', 'PERSEN'], example: 'PERSEN' },
      nilai: { type: 'number', minimum: 0, example: 10 },
      min_transaksi: { type: 'number', minimum: 0, default: 0 },
      valid_from: { type: 'string', format: 'date', nullable: true },
      valid_until: { type: 'string', format: 'date', nullable: true },
      is_active: { type: 'boolean', default: true },
    },
  },
  VoucherUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      kode: { type: 'string', maxLength: 50 },
      tipe: { type: 'string', enum: ['NOMINAL', 'PERSEN'] },
      nilai: { type: 'number', minimum: 0 },
      min_transaksi: { type: 'number', minimum: 0 },
      valid_from: { type: 'string', format: 'date', nullable: true },
      valid_until: { type: 'string', format: 'date', nullable: true },
      is_active: { type: 'boolean' },
    },
  },

  SubscriptionSettingRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      price_monthly: { type: 'integer', minimum: 0 },
      price_3_months: { type: 'integer', minimum: 0 },
      price_6_months: { type: 'integer', minimum: 0 },
      price_yearly: { type: 'integer', minimum: 0 },
      price_business_monthly: { type: 'integer', minimum: 0 },
      price_business_yearly: { type: 'integer', minimum: 0 },
      payment_ttl_hours: { type: 'integer', minimum: 1, maximum: 168 },
      maintenance_mode: { type: 'boolean' },
      maintenance_message: { type: 'string', nullable: true },
    },
  },
  SubscriptionPaymentRequest: {
    type: 'object',
    required: ['plan', 'paket'],
    properties: {
      plan: { type: 'string', enum: ['PRO', 'BUSINESS'], example: 'PRO' },
      paket: { type: 'string', enum: ['BULANAN', '3_BULAN', '6_BULAN', 'TAHUNAN'], example: 'BULANAN' },
    },
  },

  MejaCreateRequest: {
    type: 'object',
    required: ['nomor'],
    properties: { nomor: { type: 'string', maxLength: 50, example: 'A1' } },
  },
  MejaUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      nomor: { type: 'string', maxLength: 50 },
      is_active: { type: 'boolean' },
    },
  },
  ModifierGroupRequest: {
    type: 'object',
    required: ['nama'],
    properties: {
      nama: { type: 'string', maxLength: 100, example: 'Level Gula' },
      tipe: { type: 'string', enum: ['SINGLE', 'MULTI'], default: 'SINGLE' },
      wajib: { type: 'boolean', default: false },
    },
  },
  ModifierOptionRequest: {
    type: 'object',
    required: ['nama'],
    properties: {
      nama: { type: 'string', maxLength: 100, example: 'Less Sugar' },
      harga: { type: 'integer', minimum: 0, default: 0 },
    },
  },
  ProductModifierGroupsRequest: {
    type: 'object',
    properties: {
      group_ids: { type: 'array', items: { type: 'integer' }, default: [] },
    },
  },

  PembelianItem: {
    type: 'object',
    required: ['id_produk', 'harga_beli', 'qty'],
    properties: {
      id_produk: { type: 'integer', example: 1 },
      harga_beli: { type: 'integer', minimum: 0, example: 9000 },
      qty: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 10 },
    },
  },
  PembelianCreateRequest: {
    type: 'object',
    required: ['no_nota', 'tanggal', 'items'],
    properties: {
      no_nota: { type: 'string', maxLength: 50, example: 'PO-001' },
      tanggal: { type: 'string', format: 'date' },
      id_supplier: { type: 'integer', nullable: true },
      catatan: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: ref('PembelianItem') },
    },
  },
  PembelianUpdateRequest: {
    type: 'object',
    properties: {
      no_nota: { type: 'string', maxLength: 50 },
      tanggal: { type: 'string', format: 'date' },
      id_supplier: { type: 'integer', nullable: true },
      catatan: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: ref('PembelianItem') },
    },
  },
  ReturItem: {
    type: 'object',
    required: ['id_produk', 'qty'],
    properties: {
      id_produk: { type: 'integer', example: 1 },
      qty: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 1 },
      alasan: { type: 'string', maxLength: 150, nullable: true },
      kondisi: { type: 'string', maxLength: 50, nullable: true },
      harga: { type: 'integer', minimum: 0, nullable: true },
      keterangan: { type: 'string', nullable: true },
    },
  },
  ReturCreateRequest: {
    type: 'object',
    required: ['no_nota', 'tanggal', 'items'],
    properties: {
      no_nota: { type: 'string', maxLength: 50, example: 'RT-001' },
      tanggal: { type: 'string', format: 'date' },
      id_supplier: { type: 'integer', nullable: true },
      id_pembelian: { type: 'integer', nullable: true },
      catatan: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: ref('ReturItem') },
    },
  },
  ReturUpdateRequest: {
    type: 'object',
    properties: {
      no_nota: { type: 'string', maxLength: 50 },
      tanggal: { type: 'string', format: 'date' },
      id_supplier: { type: 'integer', nullable: true },
      id_pembelian: { type: 'integer', nullable: true },
      catatan: { type: 'string', nullable: true },
      items: { type: 'array', minItems: 1, items: ref('ReturItem') },
    },
  },
  PenyusutanCreateRequest: {
    type: 'object',
    required: ['harga_jual_akhir'],
    properties: {
      harga_jual_awal: { type: 'integer', minimum: 0 },
      harga_jual_akhir: { type: 'integer', minimum: 0, example: 15000 },
      prosentase: { type: 'integer', nullable: true },
    },
  },
  TransaksiCreateRequest: {
    type: 'object',
    required: ['nama', 'jenis', 'nominal', 'tanggal'],
    properties: {
      nama: { type: 'string', example: 'Beli gas' },
      jenis: { type: 'string', enum: ['M', 'K'], description: 'M=masuk, K=keluar.', example: 'K' },
      nominal: { type: 'number', example: 25000 },
      tanggal: { type: 'string', format: 'date' },
    },
  },
  PublicOrderRequest: {
    type: 'object',
    required: ['items'],
    properties: {
      customer_name: { type: 'string', maxLength: 150, nullable: true },
      note: { type: 'string', maxLength: 255, nullable: true },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['id_produk', 'qty'],
          properties: {
            id_produk: { type: 'integer', example: 1 },
            qty: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 2 },
          },
        },
      },
    },
  },
};

const commonListParams = [
  queryParam('search', { type: 'string' }, 'Kata kunci pencarian.'),
  ...paginationParams,
];

const penjualanListParams = [
  ...dateRangeParams,
  queryParam('id_user', { type: 'integer' }, 'Filter kasir/user.'),
  queryParam('id_jenis_bayar', { type: 'integer' }, 'Filter metode pembayaran.'),
  queryParam('status', { type: 'integer', enum: [0, 1] }, '1=aktif/sah, 0=void/batal.'),
  ...paginationParams,
];

const pembelianListParams = [
  queryParam('status', { type: 'integer', enum: [0, 1, 2] }, '0=draft, 1=selesai, 2=dibatalkan.'),
  ...dateRangeParams,
  queryParam('search', { type: 'string' }, 'Cari nomor nota.'),
  ...paginationParams,
];

const reportPenjualanParams = [
  queryParam('tanggal_awal', { type: 'string', format: 'date' }, 'Tanggal awal, format YYYY-MM-DD.', true),
  queryParam('tanggal_akhir', { type: 'string', format: 'date' }, 'Tanggal akhir, format YYYY-MM-DD.', true),
  queryParam('id_user', { oneOf: [{ type: 'integer' }, { type: 'string', enum: ['all'] }] }, 'ID kasir atau all.'),
  queryParam('id_jenis_bayar', { type: 'integer' }, 'Filter metode bayar.'),
  queryParam('id_shift', { type: 'integer' }, 'Filter shift.'),
  queryParam('status', { type: 'integer', enum: [0, 1], default: 1 }, '1=aktif/sah, 0=void/batal.'),
  ...paginationParams,
];

const paths = {
  '/auth/login': {
    post: op({
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Login untuk super admin, admin merchant, kasir, atau gudang. Response berisi JWT Bearer token.',
      security: [],
      requestBody: jsonBody(ref('LoginRequest')),
      responses: withErrors({
        200: apiResponse('Login berhasil.', {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { type: 'object' },
          },
        }),
      }, { auth: false, forbidden: true, validation: true, notFound: true }),
    }),
  },
  '/auth/register': {
    post: op({
      tags: ['Auth'],
      summary: 'Registrasi merchant baru',
      description: 'Menyimpan pendaftaran pending dan mengirim OTP ke email.',
      security: [],
      requestBody: jsonBody(ref('RegisterRequest')),
      responses: withErrors({
        201: createdResponse('Kode OTP telah dikirim.', {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            expires_in_minutes: { type: 'integer' },
          },
        }),
      }, { auth: false, forbidden: false, validation: true, conflict: true }),
    }),
  },
  '/auth/verify-otp': {
    post: op({
      tags: ['Auth'],
      summary: 'Verifikasi OTP registrasi',
      security: [],
      requestBody: jsonBody(ref('VerifyOtpRequest')),
      responses: withErrors({
        200: apiResponse('Merchant aktif dan admin merchant dibuat.', {
          type: 'object',
          properties: {
            merchant_id: { type: 'integer' },
            username: { type: 'string' },
            message: { type: 'string' },
          },
        }),
      }, { auth: false, forbidden: false, validation: true, notFound: true }),
    }),
  },
  '/auth/resend-otp': {
    post: op({
      tags: ['Auth'],
      summary: 'Kirim ulang OTP registrasi',
      security: [],
      requestBody: jsonBody(ref('EmailOnlyRequest')),
      responses: withErrors({
        200: apiResponse('OTP baru terkirim.', {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            cooldown: { type: 'integer' },
            expires_in_minutes: { type: 'integer' },
          },
        }),
        429: responseRef('TooManyRequests'),
      }, { auth: false, forbidden: false, validation: true, notFound: true }),
    }),
  },
  '/auth/forgot-password': {
    post: op({
      tags: ['Auth'],
      summary: 'Minta OTP reset password',
      description: 'Response selalu generik agar tidak membocorkan apakah email terdaftar.',
      security: [],
      requestBody: jsonBody(ref('EmailOnlyRequest')),
      responses: withErrors({
        200: apiResponse('Instruksi reset diproses bila email terdaftar.', {
          type: 'object',
          properties: { message: { type: 'string' } },
        }),
      }, { auth: false, forbidden: false }),
    }),
  },
  '/auth/forgot-password/resend': {
    post: op({
      tags: ['Auth'],
      summary: 'Kirim ulang OTP reset password',
      security: [],
      requestBody: jsonBody(ref('EmailOnlyRequest')),
      responses: withErrors({
        200: apiResponse('OTP reset password diproses.', {
          type: 'object',
          properties: {
            message: { type: 'string' },
            cooldown: { type: 'integer' },
          },
        }),
        429: responseRef('TooManyRequests'),
      }, { auth: false, forbidden: false }),
    }),
  },
  '/auth/reset-password': {
    post: op({
      tags: ['Auth'],
      summary: 'Reset password dengan OTP',
      security: [],
      requestBody: jsonBody(ref('ResetPasswordRequest')),
      responses: withErrors({
        200: apiResponse('Password berhasil diperbarui.', {
          type: 'object',
          properties: { message: { type: 'string' } },
        }),
        429: responseRef('TooManyRequests'),
      }, { auth: false, forbidden: false }),
    }),
  },
  '/auth/me': {
    get: op({
      tags: ['Auth'],
      summary: 'Profil user dari token',
      responses: withErrors({ 200: apiResponse('Profil user.', { type: 'object' }) }),
    }),
  },

  '/account/change-password': {
    post: op({
      tags: ['Account'],
      summary: 'Ubah password akun sendiri',
      requestBody: jsonBody(ref('ChangePasswordRequest')),
      responses: withErrors({ 200: apiResponse('Password berhasil diubah.') }),
    }),
  },
  '/account/email/request': {
    post: op({
      tags: ['Account'],
      summary: 'Minta OTP ganti email merchant',
      description: 'Khusus Admin Merchant. Email baru belum aktif sampai OTP diverifikasi.',
      requestBody: jsonBody(ref('EmailChangeRequest')),
      responses: withErrors({ 200: apiResponse('Kode OTP telah dikirim.', { type: 'object' }) }, { conflict: true }),
    }),
  },
  '/account/email/verify': {
    post: op({
      tags: ['Account'],
      summary: 'Verifikasi OTP ganti email',
      requestBody: jsonBody(ref('EmailVerifyRequest')),
      responses: withErrors({ 200: apiResponse('Email berhasil diperbarui.', { type: 'object' }) }, { conflict: true }),
    }),
  },
  '/account/email/resend': {
    post: op({
      tags: ['Account'],
      summary: 'Kirim ulang OTP ganti email',
      responses: withErrors({ 200: apiResponse('Kode OTP baru telah dikirim.', { type: 'object' }) }),
    }),
  },
  '/account/onboarding-done': {
    post: op({
      tags: ['Account'],
      summary: 'Tandai onboarding selesai',
      responses: withErrors({ 200: apiResponse('Onboarding ditandai selesai.') }),
    }),
  },

  '/merchant/me': {
    get: op({
      tags: ['Merchant'],
      summary: 'Data toko sendiri',
      responses: withErrors({ 200: apiResponse('Data merchant login.', { type: 'object' }) }),
    }),
    put: op({
      tags: ['Merchant'],
      summary: 'Ubah profil toko sendiri',
      requestBody: jsonBody(ref('MerchantUpdateRequest'), false),
      responses: withErrors({ 200: apiResponse('Data toko diperbarui.', { type: 'object' }) }, { conflict: true }),
    }),
  },
  '/merchant': {
    get: op({
      tags: ['Merchant'],
      summary: 'Daftar merchant',
      description: 'Khusus Super Admin.',
      parameters: [
        queryParam('search', { type: 'string' }, 'Cari nama toko, owner, atau email.'),
        queryParam('status', { type: 'string', enum: ['active', 'suspended', 'pending'] }, 'Filter status merchant.'),
      ],
      responses: withErrors({ 200: apiResponse('Daftar merchant.', { type: 'array', items: { type: 'object' } }) }),
    }),
  },
  '/merchant/stats': {
    get: op({
      tags: ['Merchant'],
      summary: 'Statistik merchant',
      description: 'Khusus Super Admin.',
      responses: withErrors({ 200: apiResponse('Statistik merchant.', { type: 'object' }) }),
    }),
  },
  '/merchant/{id}/dashboard': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau dashboard merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Ringkasan dashboard merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/produk': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau produk merchant',
      parameters: [idParam('ID merchant'), queryParam('search', { type: 'string' }, 'Cari produk.')],
      responses: withErrors({ 200: apiResponse('Daftar produk merchant.', { type: 'array', items: { type: 'object' } }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/kategori': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau kategori merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Daftar kategori merchant.', { type: 'array', items: { type: 'object' } }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/stok': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau laporan stok merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Laporan stok merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/penjualan': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau transaksi penjualan merchant',
      parameters: [idParam('ID merchant'), ...penjualanListParams],
      responses: withErrors({ 200: apiResponse('Transaksi penjualan merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/laporan/penjualan': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau laporan penjualan merchant',
      parameters: [idParam('ID merchant'), ...reportPenjualanParams],
      responses: withErrors({ 200: apiResponse('Laporan penjualan merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/laporan/pendapatan': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau laporan pendapatan merchant',
      parameters: [
        idParam('ID merchant'),
        queryParam('tanggal_awal', { type: 'string', format: 'date' }, 'Tanggal awal.', true),
        queryParam('tanggal_akhir', { type: 'string', format: 'date' }, 'Tanggal akhir.', true),
        queryParam('status', { type: 'integer', enum: [0, 1], default: 1 }, '1=aktif/sah, 0=void/batal.'),
      ],
      responses: withErrors({ 200: apiResponse('Laporan pendapatan merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/pengguna': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau pengguna merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Daftar pengguna merchant.', { type: 'array', items: { type: 'object' } }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/qris': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau pengaturan QRIS merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Pengaturan QRIS merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/identitas': {
    get: op({
      tags: ['Merchant Monitor'],
      summary: 'Pantau identitas toko merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Identitas merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}': {
    get: op({
      tags: ['Merchant'],
      summary: 'Detail merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Detail merchant.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/status': {
    put: op({
      tags: ['Merchant'],
      summary: 'Ubah status merchant',
      parameters: [idParam('ID merchant')],
      requestBody: jsonBody(ref('MerchantStatusRequest')),
      responses: withErrors({ 200: apiResponse('Status merchant diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/plan': {
    put: op({
      tags: ['Merchant'],
      summary: 'Set plan merchant secara manual',
      description: 'Khusus Super Admin. PRO/BUSINESS membutuhkan masa aktif; bila expires tidak dikirim default +1 bulan.',
      parameters: [idParam('ID merchant')],
      requestBody: jsonBody(ref('MerchantPlanRequest')),
      responses: withErrors({ 200: apiResponse('Plan merchant diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/merchant/{id}/plan-history': {
    get: op({
      tags: ['Merchant'],
      summary: 'Riwayat perubahan plan merchant',
      parameters: [idParam('ID merchant')],
      responses: withErrors({ 200: apiResponse('Riwayat plan.', { type: 'array', items: { type: 'object' } }) }, { notFound: true }),
    }),
  },

  '/produk': {
    get: op({
      tags: ['Produk'],
      summary: 'Daftar produk',
      parameters: [
        queryParam('search', { type: 'string' }, 'Cari nama produk atau barcode.'),
        queryParam('category_id', { oneOf: [{ type: 'integer' }, { type: 'string', enum: ['all'] }] }, 'Filter kategori.'),
        ...paginationParams,
      ],
      responses: withErrors({ 200: apiResponse('Daftar produk.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Produk'],
      summary: 'Tambah produk',
      description: 'Mendukung application/json atau multipart/form-data dengan file foto.',
      requestBody: mixedBody(ref('ProdukCreateRequest'), ref('ProdukCreateMultipartRequest')),
      responses: withErrors({ 201: createdResponse('Produk berhasil ditambahkan.', { type: 'object' }) }),
    }),
  },
  '/produk/import/template': {
    get: op({
      tags: ['Produk'],
      summary: 'Download template import produk',
      responses: withErrors({
        200: fileResponse('File Excel template import produk.', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      }, { validation: false }),
    }),
  },
  '/produk/import': {
    post: op({
      tags: ['Produk'],
      summary: 'Import produk dari Excel/CSV',
      parameters: [queryParam('dryRun', { type: 'boolean' }, 'true=validasi/preview tanpa simpan.')],
      requestBody: multipartBody(ref('ProdukImportRequest')),
      responses: withErrors({
        200: apiResponse('Import selesai atau pratinjau import.', {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            sukses: { type: 'integer' },
            gagal: { type: 'integer' },
            rows: { type: 'array', items: { type: 'object' } },
          },
        }),
      }),
    }),
  },
  '/produk/barcode/{barcode}': {
    get: op({
      tags: ['Produk'],
      summary: 'Cari produk berdasarkan barcode',
      parameters: [pathParam('barcode', { type: 'string' }, 'Barcode produk')],
      responses: withErrors({ 200: apiResponse('Produk ditemukan.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/produk/{id}/stok-history': {
    get: op({
      tags: ['Produk'],
      summary: 'Riwayat pergerakan stok produk',
      parameters: [idParam('ID produk'), ...paginationParams],
      responses: withErrors({ 200: apiResponse('Riwayat stok produk.', { type: 'array', items: { type: 'object' } }) }, { notFound: true }),
    }),
  },
  '/produk/{id}': {
    get: op({
      tags: ['Produk'],
      summary: 'Detail produk',
      parameters: [idParam('ID produk')],
      responses: withErrors({ 200: apiResponse('Detail produk.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Produk'],
      summary: 'Ubah produk',
      description: 'Mendukung application/json atau multipart/form-data dengan file foto baru.',
      parameters: [idParam('ID produk')],
      requestBody: mixedBody(ref('ProdukUpdateRequest'), ref('ProdukUpdateMultipartRequest'), false),
      responses: withErrors({ 200: apiResponse('Produk diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Produk'],
      summary: 'Hapus produk',
      parameters: [idParam('ID produk')],
      responses: withErrors({ 200: deletedResponse('Produk dihapus') }, { notFound: true, validation: false }),
    }),
  },
  '/produk/{id}/stok': {
    post: op({
      tags: ['Produk'],
      summary: 'Penyesuaian stok manual',
      parameters: [idParam('ID produk')],
      requestBody: jsonBody(ref('StockAdjustRequest')),
      responses: withErrors({ 200: apiResponse('Stok disesuaikan.', { type: 'object' }) }, { notFound: true }),
    }),
  },

  '/kategori': {
    get: op({
      tags: ['Kategori'],
      summary: 'Daftar kategori',
      responses: withErrors({ 200: apiResponse('Daftar kategori.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Kategori'],
      summary: 'Tambah kategori',
      requestBody: jsonBody(ref('KategoriRequest')),
      responses: withErrors({ 201: createdResponse('Kategori ditambahkan.', { type: 'object' }) }),
    }),
  },
  '/kategori/{id}': {
    get: op({
      tags: ['Kategori'],
      summary: 'Detail kategori',
      parameters: [idParam('ID kategori')],
      responses: withErrors({ 200: apiResponse('Detail kategori.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Kategori'],
      summary: 'Ubah kategori',
      parameters: [idParam('ID kategori')],
      requestBody: jsonBody(ref('KategoriRequest')),
      responses: withErrors({ 200: apiResponse('Data diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Kategori'],
      summary: 'Hapus kategori',
      parameters: [idParam('ID kategori')],
      responses: withErrors({ 200: deletedResponse('Data dihapus') }, { notFound: true, validation: false }),
    }),
  },

  '/supplier': {
    get: op({
      tags: ['Supplier'],
      summary: 'Daftar supplier',
      parameters: [
        queryParam('search', { type: 'string' }, 'Cari nama, telepon, atau email.'),
        queryParam('status', { type: 'integer', enum: [0, 1] }, 'Status supplier.'),
        ...paginationParams,
      ],
      responses: withErrors({ 200: apiResponse('Daftar supplier.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Supplier'],
      summary: 'Tambah supplier',
      requestBody: jsonBody(ref('SupplierCreateRequest')),
      responses: withErrors({ 201: createdResponse('Supplier ditambahkan.', { type: 'object' }) }),
    }),
  },
  '/supplier/{id}': {
    get: op({
      tags: ['Supplier'],
      summary: 'Detail supplier',
      parameters: [idParam('ID supplier')],
      responses: withErrors({ 200: apiResponse('Detail supplier.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Supplier'],
      summary: 'Ubah supplier',
      parameters: [idParam('ID supplier')],
      requestBody: jsonBody(ref('SupplierUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Data diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Supplier'],
      summary: 'Hapus supplier',
      parameters: [idParam('ID supplier')],
      responses: withErrors({ 200: deletedResponse('Data dihapus') }, { notFound: true, validation: false }),
    }),
  },

  '/jenis-bayar': {
    get: op({
      tags: ['Jenis Bayar'],
      summary: 'Daftar jenis bayar',
      responses: withErrors({ 200: apiResponse('Daftar jenis bayar.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Jenis Bayar'],
      summary: 'Tambah jenis bayar',
      requestBody: jsonBody(ref('JenisBayarRequest')),
      responses: withErrors({ 201: createdResponse('Jenis bayar ditambahkan.', { type: 'object' }) }),
    }),
  },
  '/jenis-bayar/{id}': {
    get: op({
      tags: ['Jenis Bayar'],
      summary: 'Detail jenis bayar',
      parameters: [idParam('ID jenis bayar')],
      responses: withErrors({ 200: apiResponse('Detail jenis bayar.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Jenis Bayar'],
      summary: 'Ubah jenis bayar',
      parameters: [idParam('ID jenis bayar')],
      requestBody: jsonBody(ref('JenisBayarRequest')),
      responses: withErrors({ 200: apiResponse('Data diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Jenis Bayar'],
      summary: 'Hapus jenis bayar',
      parameters: [idParam('ID jenis bayar')],
      responses: withErrors({ 200: deletedResponse('Data dihapus') }, { notFound: true, validation: false }),
    }),
  },

  '/identitas': {
    get: op({
      tags: ['Identitas'],
      summary: 'Ambil identitas toko',
      responses: withErrors({ 200: apiResponse('Identitas toko.', { type: 'object' }) }),
    }),
    put: op({
      tags: ['Identitas'],
      summary: 'Ubah identitas toko',
      requestBody: jsonBody(ref('IdentitasUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Identitas diperbarui.', { type: 'object' }) }),
    }),
  },
  '/identitas/banner': {
    post: op({
      tags: ['Identitas'],
      summary: 'Upload banner katalog',
      requestBody: multipartBody(ref('BannerUploadRequest')),
      responses: withErrors({ 200: apiResponse('Banner diperbarui.', { type: 'object' }) }),
    }),
  },
  '/identitas/logo': {
    post: op({
      tags: ['Identitas'],
      summary: 'Upload logo toko',
      requestBody: multipartBody(ref('LogoUploadRequest')),
      responses: withErrors({ 200: apiResponse('Logo diperbarui.', { type: 'object' }) }),
    }),
  },

  '/qris': {
    get: op({
      tags: ['QRIS'],
      summary: 'Ambil pengaturan QRIS statis',
      responses: withErrors({ 200: apiResponse('Pengaturan QRIS.', { type: 'object' }) }),
    }),
    put: op({
      tags: ['QRIS'],
      summary: 'Ubah pengaturan QRIS statis',
      requestBody: multipartBody(ref('QrisUpdateMultipartRequest')),
      responses: withErrors({ 200: apiResponse('Pengaturan QRIS diperbarui.', { type: 'object' }) }),
    }),
  },

  '/pengguna': {
    get: op({
      tags: ['Pengguna'],
      summary: 'Daftar pengguna',
      responses: withErrors({ 200: apiResponse('Daftar pengguna.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Pengguna'],
      summary: 'Tambah pengguna kasir/gudang',
      requestBody: jsonBody(ref('PenggunaCreateRequest')),
      responses: withErrors({ 201: createdResponse('Pengguna ditambahkan.', { type: 'object' }) }, { conflict: true }),
    }),
  },
  '/pengguna/{id}': {
    get: op({
      tags: ['Pengguna'],
      summary: 'Detail pengguna',
      parameters: [idParam('ID pengguna')],
      responses: withErrors({ 200: apiResponse('Detail pengguna.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Pengguna'],
      summary: 'Ubah pengguna',
      parameters: [idParam('ID pengguna')],
      requestBody: jsonBody(ref('PenggunaUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Pengguna diperbarui.', { type: 'object' }) }, { notFound: true, conflict: true }),
    }),
    delete: op({
      tags: ['Pengguna'],
      summary: 'Hapus pengguna',
      parameters: [idParam('ID pengguna')],
      responses: withErrors({ 200: deletedResponse('Pengguna dihapus') }, { notFound: true, validation: false }),
    }),
  },
  '/pengguna/{id}/reset-password': {
    post: op({
      tags: ['Pengguna'],
      summary: 'Reset password pengguna',
      description: 'Password baru dikembalikan sekali pada response.',
      parameters: [idParam('ID pengguna')],
      responses: withErrors({ 200: apiResponse('Password berhasil direset.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/pengguna/{id}/change-password': {
    post: op({
      tags: ['Pengguna'],
      summary: 'Ubah password pengguna dengan password lama',
      parameters: [idParam('ID pengguna')],
      requestBody: jsonBody(ref('ChangePasswordRequest')),
      responses: withErrors({ 200: apiResponse('Password diubah.') }, { notFound: true }),
    }),
  },

  '/penjualan': {
    get: op({
      tags: ['Penjualan'],
      summary: 'Daftar transaksi penjualan',
      parameters: penjualanListParams,
      responses: withErrors({ 200: apiResponse('Daftar transaksi penjualan.', { type: 'array', items: { type: 'object' } }) }),
    }),
  },
  '/penjualan/checkout': {
    post: op({
      tags: ['Penjualan'],
      summary: 'Checkout penjualan manual',
      requestBody: jsonBody(ref('CheckoutRequest')),
      responses: withErrors({ 201: createdResponse('Transaksi penjualan berhasil.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/penjualan/{id}': {
    get: op({
      tags: ['Penjualan'],
      summary: 'Detail transaksi penjualan',
      parameters: [idParam('ID penjualan')],
      responses: withErrors({ 200: apiResponse('Detail penjualan.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/penjualan/{id}/void': {
    post: op({
      tags: ['Penjualan'],
      summary: 'Void/batalkan transaksi penjualan',
      parameters: [idParam('ID penjualan')],
      responses: withErrors({ 200: apiResponse('Transaksi dibatalkan.', { type: 'object' }) }, { notFound: true, validation: false }),
    }),
  },

  '/payments/midtrans/qris/create': {
    post: op({
      tags: ['Payment Gateway'],
      summary: 'Buat pembayaran Midtrans Snap untuk transaksi POS',
      description: 'Khusus merchant plan BUSINESS. Backend membuat transaksi penjualan PENDING lalu membuat transaksi Snap Midtrans (GoPay, QRIS, VA bank, dll sesuai channel aktif).',
      requestBody: jsonBody(ref('PaymentQrisRequest')),
      responses: withErrors({
        201: createdResponse('Transaksi Snap Midtrans dibuat.', ref('QrisPaymentData')),
        502: responseRef('BadGateway'),
        503: responseRef('ServiceUnavailable'),
      }, { notFound: true }),
    }),
  },
  '/payments/status/{transaction_id}': {
    get: op({
      tags: ['Payment Gateway'],
      summary: 'Cek status pembayaran Midtrans',
      parameters: [pathParam('transaction_id', { type: 'integer' }, 'ID transaksi penjualan lokal')],
      responses: withErrors({ 200: apiResponse('Status pembayaran.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/payments/midtrans/notification': {
    post: op({
      tags: ['Payment Gateway'],
      summary: 'Webhook Midtrans transaksi POS',
      security: [],
      requestBody: jsonBody(ref('MidtransNotification')),
      responses: withErrors({ 200: webhookResponse }, { auth: false, forbidden: true, validation: false, notFound: true }),
    }),
  },
  '/midtrans/notification': {
    get: op({
      tags: ['Payment Gateway'],
      summary: 'Health check endpoint webhook Midtrans gabungan',
      security: [],
      responses: withErrors({
        200: apiResponse('Endpoint webhook public.', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        }),
      }, { auth: false, forbidden: false, validation: false }),
    }),
    post: op({
      tags: ['Payment Gateway'],
      summary: 'Webhook Midtrans gabungan',
      description: 'Router akan mengarahkan order_id ZKB-* ke billing subscription, selain itu ke transaksi POS.',
      security: [],
      requestBody: jsonBody(ref('MidtransNotification')),
      responses: withErrors({ 200: webhookResponse }, { auth: false, forbidden: true, validation: false, notFound: true }),
    }),
  },

  '/open-bill': {
    get: op({
      tags: ['Open Bill'],
      summary: 'Daftar open bill',
      parameters: [
        queryParam('status', { type: 'string', enum: ['OPEN', 'PAID', 'CANCELLED'] }, 'Filter status bill.'),
        queryParam('search', { type: 'string' }, 'Cari pelanggan, meja, atau nomor bill.'),
        ...paginationParams,
      ],
      responses: withErrors({ 200: apiResponse('Daftar open bill.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Open Bill'],
      summary: 'Buat open bill',
      description: 'Fitur PRO/BUSINESS. Stok belum dikurangi saat bill masih OPEN.',
      requestBody: jsonBody(ref('OpenBillCreateRequest')),
      responses: withErrors({ 201: createdResponse('Open bill tersimpan.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/open-bill/{id}': {
    get: op({
      tags: ['Open Bill'],
      summary: 'Detail open bill',
      parameters: [idParam('ID open bill')],
      responses: withErrors({ 200: apiResponse('Detail open bill.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Open Bill'],
      summary: 'Ubah open bill',
      parameters: [idParam('ID open bill')],
      requestBody: jsonBody(ref('OpenBillUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Open bill diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/open-bill/{id}/pay': {
    post: op({
      tags: ['Open Bill'],
      summary: 'Bayar seluruh sisa open bill',
      parameters: [idParam('ID open bill')],
      requestBody: jsonBody(ref('OpenBillPayRequest')),
      responses: withErrors({ 200: apiResponse('Open bill dibayar.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/open-bill/{id}/pay-partial': {
    post: op({
      tags: ['Open Bill'],
      summary: 'Bayar sebagian item open bill',
      parameters: [idParam('ID open bill')],
      requestBody: jsonBody(ref('OpenBillPartialPayRequest')),
      responses: withErrors({ 200: apiResponse('Split bill dibayar.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/open-bill/{id}/pay-partial/qris/create': {
    post: op({
      tags: ['Open Bill'],
      summary: 'Buat transaksi Snap Midtrans untuk split bill',
      description: 'Khusus BUSINESS. Pembayaran split dibuat PENDING sampai webhook Midtrans settle.',
      parameters: [idParam('ID open bill')],
      requestBody: jsonBody(ref('OpenBillPartialQrisRequest')),
      responses: withErrors({
        200: apiResponse('Transaksi Snap split bill dibuat.', ref('QrisPaymentData')),
        502: responseRef('BadGateway'),
        503: responseRef('ServiceUnavailable'),
      }, { notFound: true }),
    }),
  },
  '/open-bill/{id}/cancel': {
    post: op({
      tags: ['Open Bill'],
      summary: 'Batalkan open bill',
      parameters: [idParam('ID open bill')],
      responses: withErrors({ 200: apiResponse('Open bill dibatalkan.', { type: 'object' }) }, { notFound: true, validation: false }),
    }),
  },

  '/kas-shift/active': {
    get: op({
      tags: ['Kas Shift'],
      summary: 'Shift aktif milik user login',
      responses: withErrors({ 200: apiResponse('Shift aktif atau null.', { nullable: true }) }),
    }),
  },
  '/kas-shift/report/daily': {
    get: op({
      tags: ['Kas Shift'],
      summary: 'Laporan harian kas shift',
      parameters: [queryParam('tanggal', { type: 'string', format: 'date' }, 'Tanggal laporan.', true)],
      responses: withErrors({ 200: apiResponse('Laporan harian kas shift.', { type: 'object' }) }),
    }),
  },
  '/kas-shift': {
    get: op({
      tags: ['Kas Shift'],
      summary: 'Daftar shift kas',
      parameters: [
        queryParam('status', { type: 'string', enum: ['OPEN', 'CLOSED'] }, 'Filter status shift.'),
        queryParam('id_user', { type: 'integer' }, 'Filter kasir.'),
        ...dateRangeParams,
      ],
      responses: withErrors({ 200: apiResponse('Daftar shift kas.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Kas Shift'],
      summary: 'Buka shift kas',
      requestBody: jsonBody(ref('KasShiftOpenRequest'), false),
      responses: withErrors({ 201: createdResponse('Sesi kas dibuka.', { type: 'object' }) }),
    }),
  },
  '/kas-shift/{id}': {
    get: op({
      tags: ['Kas Shift'],
      summary: 'Detail shift kas',
      parameters: [idParam('ID shift')],
      responses: withErrors({ 200: apiResponse('Detail shift kas.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/kas-shift/{id}/mutasi': {
    post: op({
      tags: ['Kas Shift'],
      summary: 'Catat mutasi kas masuk/keluar',
      parameters: [idParam('ID shift')],
      requestBody: jsonBody(ref('KasMutasiRequest')),
      responses: withErrors({ 201: createdResponse('Mutasi kas dicatat.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/kas-shift/{id}/close-preview': {
    get: op({
      tags: ['Kas Shift'],
      summary: 'Preview perhitungan tutup shift',
      parameters: [idParam('ID shift')],
      responses: withErrors({ 200: apiResponse('Preview closing shift.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/kas-shift/{id}/close': {
    post: op({
      tags: ['Kas Shift'],
      summary: 'Tutup shift kas',
      parameters: [idParam('ID shift')],
      requestBody: jsonBody(ref('KasShiftCloseRequest')),
      responses: withErrors({ 200: apiResponse('Sesi kas ditutup.', { type: 'object' }) }, { notFound: true }),
    }),
  },

  '/tax': {
    get: op({
      tags: ['Tax'],
      summary: 'Ambil pengaturan pajak dan service charge',
      responses: withErrors({ 200: apiResponse('Pengaturan pajak.', { type: 'object' }) }),
    }),
    put: op({
      tags: ['Tax'],
      summary: 'Ubah pengaturan pajak dan service charge',
      requestBody: jsonBody(ref('TaxUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Pengaturan pajak diperbarui.', { type: 'object' }) }),
    }),
  },

  '/voucher': {
    get: op({
      tags: ['Voucher'],
      summary: 'Daftar voucher',
      responses: withErrors({ 200: apiResponse('Daftar voucher.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Voucher'],
      summary: 'Buat voucher',
      requestBody: jsonBody(ref('VoucherCreateRequest')),
      responses: withErrors({ 201: createdResponse('Voucher dibuat.', { type: 'object' }) }, { conflict: true }),
    }),
  },
  '/voucher/validate': {
    get: op({
      tags: ['Voucher'],
      summary: 'Validasi voucher untuk subtotal',
      parameters: [
        queryParam('kode', { type: 'string' }, 'Kode voucher.', true),
        queryParam('subtotal', { type: 'number', minimum: 0 }, 'Subtotal transaksi.', true),
      ],
      responses: withErrors({ 200: apiResponse('Voucher valid.', { type: 'object' }) }, { notFound: true, validation: false }),
    }),
  },
  '/voucher/{id}': {
    put: op({
      tags: ['Voucher'],
      summary: 'Ubah voucher',
      parameters: [idParam('ID voucher')],
      requestBody: jsonBody(ref('VoucherUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Voucher diperbarui.', { type: 'object' }) }, { notFound: true, conflict: true }),
    }),
    delete: op({
      tags: ['Voucher'],
      summary: 'Hapus voucher',
      parameters: [idParam('ID voucher')],
      responses: withErrors({ 200: deletedResponse('Voucher dihapus') }, { notFound: true, validation: false }),
    }),
  },

  '/subscription/setting': {
    get: op({
      tags: ['Subscription'],
      summary: 'Ambil setting subscription',
      responses: withErrors({ 200: apiResponse('Setting subscription.', { type: 'object' }) }),
    }),
    put: op({
      tags: ['Subscription'],
      summary: 'Ubah setting subscription',
      description: 'Khusus Super Admin.',
      requestBody: jsonBody(ref('SubscriptionSettingRequest')),
      responses: withErrors({ 200: apiResponse('Harga paket diperbarui.', { type: 'object' }) }),
    }),
  },
  '/subscription/billing': {
    get: op({
      tags: ['Subscription'],
      summary: 'Status billing merchant login',
      responses: withErrors({ 200: apiResponse('Billing merchant.', { type: 'object' }) }),
    }),
  },
  '/subscription/payment': {
    post: op({
      tags: ['Subscription'],
      summary: 'Buat pembayaran upgrade plan',
      description: 'Admin Merchant. Saat ini upgrade BUSINESS via endpoint ini ditolak service dan diarahkan via WhatsApp. Response berisi SNAP_TOKEN + MIDTRANS_CLIENT_KEY untuk window.snap.pay() di frontend.',
      requestBody: jsonBody(ref('SubscriptionPaymentRequest')),
      responses: withErrors({
        201: createdResponse('Transaksi Snap upgrade plan berhasil dibuat.', { type: 'object' }),
        502: responseRef('BadGateway'),
        503: responseRef('ServiceUnavailable'),
      }, { conflict: true }),
    }),
  },
  '/midtrans-test/gopay-qris': {
    post: op({
      tags: ['MidtransTest'],
      summary: 'Charge GoPay Rp1 via Core API (cek GoPay QRIS Aggregator)',
      description: 'Khusus Super Admin. Pakai akun Midtrans BILLING (bukan akun QRIS merchant), lewat Core API /v2/charge (BUKAN Snap) supaya QR-nya langsung tampil tanpa layar pilih metode bayar. Tidak menyimpan data apapun ke database - order_id sengaja tidak match format pembayaran langganan asli, jadi webhook Midtrans untuk transaksi ini otomatis ditolak (400) kalau kebetulan masuk. Catatan: berbeda dari Snap, akses Core API per-channel kadang butuh aktivasi terpisah dari Midtrans - kalau endpoint ini gagal, belum tentu berarti aggregator tidak aktif.',
      responses: withErrors({
        200: apiResponse('QR GoPay test Rp1 berhasil dibuat.', {
          type: 'object',
          properties: {
            order_id: { type: 'string', example: 'ZKBTEST-1783471143474' },
            transaction_status: { type: 'string', nullable: true, example: 'pending' },
            qr_image_url: { type: 'string', nullable: true, description: 'URL gambar QR (Midtrans generate-qr-code action).' },
            qr_string: { type: 'string', nullable: true, description: 'Payload QRIS mentah, kalau Midtrans mengembalikannya.' },
            raw: { type: 'object', description: 'Respons mentah Midtrans /v2/charge, buat diagnosa.' },
          },
        }),
        502: responseRef('BadGateway'),
        503: responseRef('ServiceUnavailable'),
      }),
    }),
  },
  '/subscription/payment/{id}/status': {
    get: op({
      tags: ['Subscription'],
      summary: 'Cek status pembayaran upgrade plan',
      parameters: [idParam('ID pembayaran subscription')],
      responses: withErrors({ 200: apiResponse('Status pembayaran subscription.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/subscription/payment/{id}/cancel': {
    post: op({
      tags: ['Subscription'],
      summary: 'Batalkan pembayaran upgrade plan yang masih PENDING',
      description: 'Admin Merchant. Membatalkan tagihan Snap Midtrans yang belum dibayar (di Midtrans + lokal), agar bisa langsung membuat tagihan baru tanpa menunggu kedaluwarsa.',
      parameters: [idParam('ID pembayaran subscription')],
      responses: withErrors({ 200: apiResponse('Pembayaran dibatalkan.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/subscription/payments': {
    get: op({
      tags: ['Subscription'],
      summary: 'Daftar semua pembayaran subscription',
      description: 'Khusus Super Admin.',
      parameters: [queryParam('status', { type: 'string', enum: ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED'] }, 'Filter status.')],
      responses: withErrors({ 200: apiResponse('Daftar pembayaran subscription.', { type: 'array', items: { type: 'object' } }) }),
    }),
  },
  '/subscription/payments/{id}': {
    get: op({
      tags: ['Subscription'],
      summary: 'Detail pembayaran subscription',
      parameters: [idParam('ID pembayaran')],
      responses: withErrors({ 200: apiResponse('Detail pembayaran subscription.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/subscription/revenue': {
    get: op({
      tags: ['Subscription'],
      summary: 'Ringkasan revenue subscription',
      description: 'Khusus Super Admin.',
      parameters: dateRangeParams,
      responses: withErrors({ 200: apiResponse('Ringkasan revenue.', { type: 'object' }) }),
    }),
  },
  '/subscription/revenue/chart': {
    get: op({
      tags: ['Subscription'],
      summary: 'Grafik revenue subscription tahunan',
      description: 'Khusus Super Admin.',
      parameters: [queryParam('tahun', { type: 'integer', minimum: 2000, maximum: 2100 }, 'Tahun grafik.')],
      responses: withErrors({ 200: apiResponse('Grafik revenue.', { type: 'object' }) }),
    }),
  },
  '/subscription/midtrans/notification': {
    post: op({
      tags: ['Subscription'],
      summary: 'Webhook Midtrans khusus billing subscription',
      security: [],
      requestBody: jsonBody(ref('MidtransNotification')),
      responses: withErrors({ 200: webhookResponse }, { auth: false, forbidden: true, validation: false, notFound: true }),
    }),
  },

  '/meja': {
    get: op({
      tags: ['Meja'],
      summary: 'Daftar meja',
      responses: withErrors({ 200: apiResponse('Daftar meja.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Meja'],
      summary: 'Tambah meja',
      requestBody: jsonBody(ref('MejaCreateRequest')),
      responses: withErrors({ 201: createdResponse('Meja dibuat.', { type: 'object' }) }, { conflict: true }),
    }),
  },
  '/meja/{id}': {
    put: op({
      tags: ['Meja'],
      summary: 'Ubah meja',
      parameters: [idParam('ID meja')],
      requestBody: jsonBody(ref('MejaUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Meja diperbarui.', { type: 'object' }) }, { notFound: true, conflict: true }),
    }),
    delete: op({
      tags: ['Meja'],
      summary: 'Hapus meja',
      parameters: [idParam('ID meja')],
      responses: withErrors({ 200: deletedResponse('Meja dihapus') }, { notFound: true, validation: false }),
    }),
  },

  '/modifier/groups': {
    get: op({
      tags: ['Modifier'],
      summary: 'Daftar grup modifier',
      responses: withErrors({ 200: apiResponse('Daftar grup modifier.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Modifier'],
      summary: 'Tambah grup modifier',
      requestBody: jsonBody(ref('ModifierGroupRequest')),
      responses: withErrors({ 201: createdResponse('Grup modifier dibuat.', { type: 'object' }) }),
    }),
  },
  '/modifier/groups/{id}': {
    put: op({
      tags: ['Modifier'],
      summary: 'Ubah grup modifier',
      parameters: [idParam('ID grup modifier')],
      requestBody: jsonBody(ref('ModifierGroupRequest')),
      responses: withErrors({ 200: apiResponse('Grup diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Modifier'],
      summary: 'Hapus grup modifier',
      parameters: [idParam('ID grup modifier')],
      responses: withErrors({ 200: deletedResponse('Grup dihapus') }, { notFound: true, validation: false }),
    }),
  },
  '/modifier/groups/{id}/options': {
    post: op({
      tags: ['Modifier'],
      summary: 'Tambah opsi modifier',
      parameters: [idParam('ID grup modifier')],
      requestBody: jsonBody(ref('ModifierOptionRequest')),
      responses: withErrors({ 201: createdResponse('Opsi ditambahkan.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/modifier/options/{id}': {
    put: op({
      tags: ['Modifier'],
      summary: 'Ubah opsi modifier',
      parameters: [idParam('ID opsi modifier')],
      requestBody: jsonBody(ref('ModifierOptionRequest')),
      responses: withErrors({ 200: apiResponse('Opsi diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Modifier'],
      summary: 'Hapus opsi modifier',
      parameters: [idParam('ID opsi modifier')],
      responses: withErrors({ 200: deletedResponse('Opsi dihapus') }, { notFound: true, validation: false }),
    }),
  },
  '/modifier/produk/{id}': {
    get: op({
      tags: ['Modifier'],
      summary: 'Ambil grup modifier produk',
      parameters: [idParam('ID produk')],
      responses: withErrors({ 200: apiResponse('Modifier produk.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Modifier'],
      summary: 'Set grup modifier produk',
      parameters: [idParam('ID produk')],
      requestBody: jsonBody(ref('ProductModifierGroupsRequest'), false),
      responses: withErrors({ 200: apiResponse('Varian produk disimpan.', { type: 'object' }) }, { notFound: true }),
    }),
  },

  '/pembelian': {
    get: op({
      tags: ['Pembelian'],
      summary: 'Daftar pembelian',
      parameters: pembelianListParams,
      responses: withErrors({ 200: apiResponse('Daftar pembelian.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Pembelian'],
      summary: 'Buat pembelian draft',
      requestBody: jsonBody(ref('PembelianCreateRequest')),
      responses: withErrors({ 201: createdResponse('Pembelian draft dibuat.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/pembelian/{id}': {
    get: op({
      tags: ['Pembelian'],
      summary: 'Detail pembelian',
      parameters: [idParam('ID pembelian')],
      responses: withErrors({ 200: apiResponse('Detail pembelian.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Pembelian'],
      summary: 'Ubah pembelian draft',
      parameters: [idParam('ID pembelian')],
      requestBody: jsonBody(ref('PembelianUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Pembelian diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Pembelian'],
      summary: 'Hapus pembelian draft',
      parameters: [idParam('ID pembelian')],
      responses: withErrors({ 200: deletedResponse('Pembelian dihapus') }, { notFound: true, validation: false }),
    }),
  },
  '/pembelian/{id}/selesaikan': {
    post: op({
      tags: ['Pembelian'],
      summary: 'Selesaikan pembelian dan tambah stok',
      parameters: [idParam('ID pembelian')],
      responses: withErrors({ 200: apiResponse('Pembelian selesai.', { type: 'object' }) }, { notFound: true, validation: false }),
    }),
  },
  '/pembelian/{id}/batal': {
    post: op({
      tags: ['Pembelian'],
      summary: 'Batalkan pembelian draft',
      parameters: [idParam('ID pembelian')],
      responses: withErrors({ 200: apiResponse('Pembelian dibatalkan.', { type: 'object' }) }, { notFound: true, validation: false }),
    }),
  },

  '/retur': {
    get: op({
      tags: ['Retur'],
      summary: 'Daftar retur pembelian',
      parameters: pembelianListParams,
      responses: withErrors({ 200: apiResponse('Daftar retur.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Retur'],
      summary: 'Buat retur draft',
      requestBody: jsonBody(ref('ReturCreateRequest')),
      responses: withErrors({ 201: createdResponse('Retur draft dibuat.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/retur/{id}': {
    get: op({
      tags: ['Retur'],
      summary: 'Detail retur',
      parameters: [idParam('ID retur')],
      responses: withErrors({ 200: apiResponse('Detail retur.', { type: 'object' }) }, { notFound: true }),
    }),
    put: op({
      tags: ['Retur'],
      summary: 'Ubah retur draft',
      parameters: [idParam('ID retur')],
      requestBody: jsonBody(ref('ReturUpdateRequest')),
      responses: withErrors({ 200: apiResponse('Retur diperbarui.', { type: 'object' }) }, { notFound: true }),
    }),
    delete: op({
      tags: ['Retur'],
      summary: 'Hapus retur draft',
      parameters: [idParam('ID retur')],
      responses: withErrors({ 200: deletedResponse('Retur dihapus') }, { notFound: true, validation: false }),
    }),
  },
  '/retur/{id}/selesaikan': {
    post: op({
      tags: ['Retur'],
      summary: 'Selesaikan retur dan kurangi stok',
      parameters: [idParam('ID retur')],
      responses: withErrors({ 200: apiResponse('Retur selesai.', { type: 'object' }) }, { notFound: true, validation: false }),
    }),
  },
  '/retur/{id}/batal': {
    post: op({
      tags: ['Retur'],
      summary: 'Batalkan/void retur',
      parameters: [idParam('ID retur')],
      responses: withErrors({ 200: apiResponse('Retur dibatalkan.', { type: 'object' }) }, { notFound: true, validation: false }),
    }),
  },

  '/penyusutan/produk/{id}': {
    get: op({
      tags: ['Penyusutan'],
      summary: 'Riwayat penyusutan produk',
      parameters: [idParam('ID produk')],
      responses: withErrors({ 200: apiResponse('Riwayat penyusutan.', { type: 'array', items: { type: 'object' } }) }, { notFound: true }),
    }),
    post: op({
      tags: ['Penyusutan'],
      summary: 'Catat penyusutan harga jual produk',
      parameters: [idParam('ID produk')],
      requestBody: jsonBody(ref('PenyusutanCreateRequest')),
      responses: withErrors({ 201: createdResponse('Penyusutan dicatat.', { type: 'object' }) }, { notFound: true }),
    }),
  },
  '/penyusutan/{id}': {
    delete: op({
      tags: ['Penyusutan'],
      summary: 'Hapus penyusutan dan kembalikan harga jual',
      parameters: [idParam('ID penyusutan')],
      responses: withErrors({ 200: deletedResponse('Penyusutan dihapus, harga jual dikembalikan') }, { notFound: true, validation: false }),
    }),
  },

  '/transaksi-keuangan': {
    get: op({
      tags: ['Transaksi Keuangan'],
      summary: 'Daftar transaksi keuangan',
      parameters: [
        queryParam('tanggal', { type: 'string', format: 'date' }, 'Filter tanggal tunggal.'),
        ...dateRangeParams,
      ],
      responses: withErrors({ 200: apiResponse('Daftar transaksi keuangan.', { type: 'array', items: { type: 'object' } }) }),
    }),
    post: op({
      tags: ['Transaksi Keuangan'],
      summary: 'Catat transaksi keuangan',
      requestBody: jsonBody(ref('TransaksiCreateRequest')),
      responses: withErrors({ 201: createdResponse('Transaksi keuangan dicatat.', { type: 'object' }) }),
    }),
  },
  '/transaksi-keuangan/{id}': {
    delete: op({
      tags: ['Transaksi Keuangan'],
      summary: 'Hapus transaksi keuangan',
      parameters: [idParam('ID transaksi keuangan')],
      responses: withErrors({ 200: deletedResponse('Transaksi keuangan dihapus') }, { notFound: true, validation: false }),
    }),
  },

  '/laporan/penjualan': {
    get: op({
      tags: ['Laporan'],
      summary: 'Laporan penjualan',
      parameters: reportPenjualanParams,
      responses: withErrors({ 200: apiResponse('Laporan penjualan.', { type: 'object' }) }),
    }),
  },
  '/laporan/pendapatan': {
    get: op({
      tags: ['Laporan'],
      summary: 'Laporan pendapatan/laba rugi',
      parameters: [
        queryParam('tanggal_awal', { type: 'string', format: 'date' }, 'Tanggal awal.', true),
        queryParam('tanggal_akhir', { type: 'string', format: 'date' }, 'Tanggal akhir.', true),
        queryParam('status', { type: 'integer', enum: [0, 1], default: 1 }, '1=aktif/sah, 0=void/batal.'),
      ],
      responses: withErrors({ 200: apiResponse('Laporan pendapatan.', { type: 'object' }) }),
    }),
  },
  '/laporan/stok': {
    get: op({
      tags: ['Laporan'],
      summary: 'Laporan stok',
      parameters: commonListParams,
      responses: withErrors({ 200: apiResponse('Laporan stok.', { type: 'object' }) }),
    }),
  },
  '/laporan/penyusutan': {
    get: op({
      tags: ['Laporan'],
      summary: 'Laporan penyusutan',
      responses: withErrors({ 200: apiResponse('Laporan penyusutan.', { type: 'array', items: { type: 'object' } }) }),
    }),
  },
  '/laporan/rekap': {
    get: op({
      tags: ['Laporan'],
      summary: 'Rekap laporan lengkap',
      description: 'Khusus plan PRO/BUSINESS.',
      parameters: [
        queryParam('tanggal_awal', { type: 'string', format: 'date' }, 'Tanggal awal.', true),
        queryParam('tanggal_akhir', { type: 'string', format: 'date' }, 'Tanggal akhir.', true),
        queryParam('status', { type: 'integer', enum: [0, 1], default: 1 }, '1=aktif/sah, 0=void/batal.'),
        queryParam('top_limit', { type: 'integer', minimum: 1, maximum: 100, default: 10 }, 'Jumlah produk terlaris.'),
      ],
      responses: withErrors({ 200: apiResponse('Rekap laporan lengkap.', { type: 'object' }) }),
    }),
  },
  '/laporan/rekap/export': {
    get: op({
      tags: ['Laporan'],
      summary: 'Export rekap laporan ke CSV',
      description: 'Khusus plan PRO/BUSINESS.',
      parameters: [
        queryParam('tanggal_awal', { type: 'string', format: 'date' }, 'Tanggal awal.', true),
        queryParam('tanggal_akhir', { type: 'string', format: 'date' }, 'Tanggal akhir.', true),
        queryParam('status', { type: 'integer', enum: [0, 1], default: 1 }, '1=aktif/sah, 0=void/batal.'),
        queryParam('top_limit', { type: 'integer', minimum: 1, maximum: 100, default: 10 }, 'Jumlah produk terlaris.'),
      ],
      responses: withErrors({
        200: fileResponse('File CSV rekap laporan.', 'text/csv'),
      }, { validation: true }),
    }),
  },

  '/dashboard/summary': {
    get: op({
      tags: ['Dashboard'],
      summary: 'Ringkasan dashboard',
      responses: withErrors({ 200: apiResponse('Ringkasan dashboard.', { type: 'object' }) }),
    }),
  },
  '/dashboard/chart': {
    get: op({
      tags: ['Dashboard'],
      summary: 'Grafik omzet dan laba tahunan',
      parameters: [queryParam('tahun', { type: 'integer', minimum: 2000, maximum: 2100 }, 'Tahun grafik.', true)],
      responses: withErrors({ 200: apiResponse('Grafik tahunan.', { type: 'object' }) }),
    }),
  },
  '/dashboard/gudang': {
    get: op({
      tags: ['Dashboard'],
      summary: 'Dashboard operasional gudang',
      description: 'Tidak memuat data keuangan.',
      responses: withErrors({ 200: apiResponse('Dashboard gudang.', { type: 'object' }) }),
    }),
  },

  '/public/maintenance': {
    get: op({
      tags: ['Public'],
      summary: 'Status maintenance publik',
      security: [],
      responses: withErrors({ 200: apiResponse('Status maintenance.', { type: 'object' }) }, { auth: false, forbidden: false, validation: false }),
    }),
  },
  '/public/menu/{token}': {
    get: op({
      tags: ['Public'],
      summary: 'Menu QR meja publik',
      security: [],
      parameters: [pathParam('token', { type: 'string' }, 'Token QR meja')],
      responses: withErrors({ 200: apiResponse('Menu QR meja.', { type: 'object' }) }, { auth: false, notFound: true, validation: false }),
    }),
  },
  '/public/menu/{token}/order': {
    post: op({
      tags: ['Public'],
      summary: 'Buat pesanan dari menu QR',
      security: [],
      parameters: [pathParam('token', { type: 'string' }, 'Token QR meja')],
      requestBody: jsonBody(ref('PublicOrderRequest')),
      responses: withErrors({ 201: createdResponse('Pesanan terkirim.', { type: 'object' }) }, { auth: false, notFound: true }),
    }),
  },
  '/public/store/{slug}': {
    get: op({
      tags: ['Public'],
      summary: 'Katalog publik toko',
      security: [],
      parameters: [pathParam('slug', { type: 'string' }, 'Slug toko')],
      responses: withErrors({ 200: apiResponse('Katalog publik toko.', { type: 'object' }) }, { auth: false, notFound: true, validation: false }),
    }),
  },

  '/wilayah/provinsi': {
    get: op({
      tags: ['Wilayah'],
      summary: 'Daftar provinsi',
      security: [],
      responses: withErrors({ 200: apiResponse('Daftar provinsi.', { type: 'array', items: { type: 'object' } }) }, { auth: false, forbidden: false, validation: false }),
    }),
  },
  '/wilayah/kota': {
    get: op({
      tags: ['Wilayah'],
      summary: 'Daftar kota berdasarkan provinsi',
      security: [],
      parameters: [queryParam('provinsi_id', { type: 'integer' }, 'ID provinsi.', true)],
      responses: withErrors({ 200: apiResponse('Daftar kota.', { type: 'array', items: { type: 'object' } }) }, { auth: false, forbidden: false, validation: false }),
    }),
  },

  '/': {
    get: op({
      tags: ['System'],
      summary: 'Info root API terproteksi',
      responses: withErrors({
        200: apiResponse('Info API.', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            docs: { type: 'string' },
          },
        }),
      }, { validation: false }),
    }),
  },
};

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'POS Backend API',
    version: '1.0.0',
    description: 'Dokumentasi API POS Backend. Semua path memakai base `/api`, kecuali `/health`, `/api-docs`, dan `/api-docs.json`.',
  },
  servers: [{ url: '/api', description: 'Base path API' }],
  tags: [
    { name: 'Auth', description: 'Login, registrasi, OTP, dan profil token.' },
    { name: 'Account', description: 'Akun sendiri: password, email, onboarding.' },
    { name: 'Merchant', description: 'Profil toko dan administrasi merchant.' },
    { name: 'Merchant Monitor', description: 'Pemantauan data merchant oleh Super Admin.' },
    { name: 'Produk', description: 'Master produk, stok, dan import.' },
    { name: 'Kategori', description: 'Master kategori produk.' },
    { name: 'Supplier', description: 'Master supplier.' },
    { name: 'Jenis Bayar', description: 'Master metode pembayaran.' },
    { name: 'Identitas', description: 'Identitas, logo, dan banner toko.' },
    { name: 'QRIS', description: 'Pengaturan QRIS statis toko.' },
    { name: 'Pengguna', description: 'Manajemen pengguna merchant.' },
    { name: 'Penjualan', description: 'Checkout dan riwayat penjualan.' },
    { name: 'Payment Gateway', description: 'Midtrans Snap (GoPay, QRIS, VA bank, dll) dan webhook.' },
    { name: 'Open Bill', description: 'Open bill, split bill, dan pembayaran bill.' },
    { name: 'Kas Shift', description: 'Shift kas, mutasi, closing, dan laporan harian.' },
    { name: 'Tax', description: 'PPN dan service charge.' },
    { name: 'Voucher', description: 'Voucher dan validasi diskon.' },
    { name: 'Subscription', description: 'Billing plan dan pembayaran upgrade.' },
    { name: 'MidtransTest', description: 'Alat internal Super Admin buat ngecek status channel pembayaran Midtrans (bukan fitur bisnis, tidak nyimpan data).' },
    { name: 'Meja', description: 'Master meja dan QR token.' },
    { name: 'Modifier', description: 'Modifier/varian produk.' },
    { name: 'Pembelian', description: 'Dokumen pembelian dan stok masuk.' },
    { name: 'Retur', description: 'Retur pembelian dan stok keluar.' },
    { name: 'Penyusutan', description: 'Penyusutan harga jual produk.' },
    { name: 'Transaksi Keuangan', description: 'Pencatatan kas masuk/keluar non-penjualan.' },
    { name: 'Laporan', description: 'Laporan operasional dan keuangan.' },
    { name: 'Dashboard', description: 'Ringkasan dashboard.' },
    { name: 'Public', description: 'Endpoint publik katalog dan QR menu.' },
    { name: 'Wilayah', description: 'Referensi provinsi dan kota publik.' },
    { name: 'System', description: 'Informasi sistem API.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas,
    responses: {
      Unauthorized: {
        description: 'Token tidak ada atau tidak valid.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      Forbidden: {
        description: 'Akses ditolak atau plan/role tidak memenuhi syarat.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      NotFound: {
        description: 'Data tidak ditemukan.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      ValidationError: {
        description: 'Validasi request gagal.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      Conflict: {
        description: 'Data konflik atau masih ada proses aktif.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      TooManyRequests: {
        description: 'Rate limit/cooldown masih aktif.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      BadGateway: {
        description: 'Gateway eksternal gagal merespons dengan benar.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      ServiceUnavailable: {
        description: 'Konfigurasi layanan belum lengkap atau layanan belum tersedia.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
      ServerError: {
        description: 'Internal server error.',
        content: { 'application/json': { schema: ref('ErrorResponse') } },
      },
    },
  },
  security: bearer,
  paths,
};
