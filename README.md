# 🌐 Cloudflare DDNS Manager

<div align="center">

![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-000000?logo=flask&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-API-F38020?logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

**Ứng dụng web quản lý Cloudflare DNS & Dynamic DNS (DDNS) — Chạy trên Docker / Synology NAS**

</div>

---

## ✨ Tính năng

- 🔐 **Xác thực** — Đăng nhập bảo mật, đổi mật khẩu
- 📡 **Dynamic DNS (DDNS)** — Tự động cập nhật DNS khi IP công cộng thay đổi
- 🏠 **Quản lý Zone (Domain)** — Xem, thêm, xóa domain trên Cloudflare
- 📝 **Quản lý DNS Record** — Tạo, sửa, xóa bản ghi DNS (A, CNAME, MX, TXT, ...)
- 🚇 **Cloudflare Tunnel** — Tạo và quản lý tunnel, cấu hình ingress route
- 🐳 **Docker Connector** — Tự động chạy `cloudflared` connector qua Docker
- 📊 **Logs** — Xem lịch sử cập nhật IP theo thời gian thực
- ⚙️ **Cấu hình linh hoạt** — Đặt khoảng thời gian cập nhật, quản lý nhiều record

---

## 🚀 Triển khai nhanh

### Yêu cầu

- Docker & Docker Compose
- Cloudflare API Token (với quyền `Zone:Edit` và `DNS:Edit`)

### Cách lấy Cloudflare API Token

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vào **My Profile → API Tokens → Create Token**
3. Chọn template **"Edit zone DNS"** hoặc tạo Custom Token với:
   - `Zone > Zone > Read`
   - `Zone > DNS > Edit`
   - `Account > Cloudflare Tunnel > Edit` *(nếu dùng Tunnel)*
4. Sao chép token

---

## 🐳 Cài đặt bằng Docker

### Cách 1: Docker Compose (Khuyến nghị)

```bash
# 1. Clone repo
git clone https://github.com/nqthaivl/cloudflare-ddns.git
cd cloudflare-ddns/App

# 2. Chỉnh sửa bí mật session (khuyến nghị)
# Mở docker-compose.yml và đổi giá trị CF_DDNS_SECRET

# 3. Chạy
docker compose up -d

# 4. Xem logs
docker compose logs -f
```

### Cách 2: Docker Run

```bash
docker run -d \
  --name cf-ddns-manager \
  --restart unless-stopped \
  -p 9797:9797 \
  -v cf_ddns_data:/app/data \
  -e CF_DDNS_SECRET=your-secret-key \
  nqthaivl/cloudflare-ddns:latest
```

### Cách 3: Synology Container Manager

1. Mở **Container Manager → Registry** → Tìm `nqthaivl/cloudflare-ddns`
2. Tải image về
3. Tạo Container với cấu hình:
   | Mục | Giá trị |
   |---|---|
   | Port | `9797:9797` |
   | Volume | `/app/data` → thư mục local |
   | Env | `CF_DDNS_SECRET=your-secret` |

---

## 🖥️ Truy cập Web UI

Sau khi chạy, mở trình duyệt tại:

```
http://[IP-máy-chủ]:9797
```

**Tài khoản mặc định:**
- Username: `admin`
- Password: `admin`

> ⚠️ **Hãy đổi mật khẩu ngay sau lần đăng nhập đầu tiên!**

---

## 📖 Hướng dẫn sử dụng

### Bước 1 — Nhập API Token

- Vào tab **Cài đặt** → Nhập Cloudflare API Token → Nhấn **Lưu & Xác minh**

### Bước 2 — Cấu hình DDNS

1. Vào tab **DNS** → Chọn domain → Chọn record A muốn theo dõi
2. Nhấn **"Thêm vào DDNS"**
3. Vào tab **DDNS** → Nhấn **Bắt đầu Service**
4. DDNS sẽ tự động kiểm tra và cập nhật IP theo chu kỳ đã cài

### Bước 3 — Quản lý Tunnel (tuỳ chọn)

1. Vào tab **Tunnel** → Nhấn **"Tạo Tunnel mới"**
2. Đặt tên tunnel và thêm routes (hostname → service nội bộ)
3. Tunnel connector sẽ tự động chạy qua Docker

---

## ⚙️ Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `CF_DDNS_PORT` | `9797` | Cổng lắng nghe của ứng dụng |
| `CF_DDNS_SECRET` | Random | Secret key cho Flask session (nên đặt cố định) |
| `CF_DDNS_DEBUG` | `false` | Bật debug mode Flask |
| `PYTHONUNBUFFERED` | `1` | Hiển thị log ngay lập tức |

---

## 📂 Cấu trúc dự án

```
cloudflare-ddns/
└── App/
    ├── app.py              # Flask application chính
    ├── cloudflare_api.py   # Cloudflare API client
    ├── ddns_service.py     # DDNS background service
    ├── auth.py             # Xác thực người dùng
    ├── requirements.txt    # Python dependencies
    ├── Dockerfile          # Docker build file
    ├── docker-compose.yml  # Docker Compose config
    ├── templates/
    │   └── index.html      # Giao diện web (Single Page App)
    └── static/
        ├── css/            # Stylesheets
        └── js/             # JavaScript
```

### Dữ liệu được lưu trữ (volume `/app/data`)

| File | Mô tả |
|------|-------|
| `config.json` | Cấu hình API token, DDNS records, logs |
| `credentials.json` | Thông tin đăng nhập (đã hash) |

---

## 🔧 Phát triển

```bash
# Clone và cài dependencies
git clone https://github.com/nqthaivl/cloudflare-ddns.git
cd cloudflare-ddns/App
pip install -r requirements.txt

# Chạy development server
python app.py
```

---

## 🐛 Xử lý sự cố

**App không khởi động:**
```bash
docker compose logs cf-ddns-manager
```

**Quên mật khẩu:**
```bash
# Xóa file credentials để reset về admin/admin
docker exec cf-ddns-manager rm /app/data/credentials.json
docker restart cf-ddns-manager
```

**DDNS không cập nhật:**
- Kiểm tra API Token có quyền `DNS:Edit`
- Xem log trong tab **Logs** của ứng dụng
- Kiểm tra record đã được thêm vào danh sách DDNS

---

## 📄 License

MIT License — Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

<div align="center">
Made with ❤️ for Synology NAS users
</div>
