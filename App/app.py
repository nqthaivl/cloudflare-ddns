"""
Cloudflare DDNS Manager - Main Flask Application
A web-based application for managing Cloudflare DNS records and Dynamic DNS updates.
Designed for Synology NAS deployment.
"""

import sys
import os

# Bootstrap: add lib/ (pip --target) to path for Synology package deployment
_base_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(_base_dir, "lib")
if os.path.isdir(_lib_dir) and _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from flask import Flask, render_template, request, jsonify, session
from ddns_service import DDNSService
from cloudflare_api import CloudflareAPI
from auth import authenticate, login_required, get_current_user, change_password, is_first_login
import logging
import secrets

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get('CF_DDNS_SECRET', secrets.token_hex(32))
app.config['SESSION_COOKIE_NAME'] = 'cf_ddns_session'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours
ddns = DDNSService()


# ─── Auth Routes ───────────────────────────────────────────────────

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "error": "missing_credentials"})

    if authenticate(username, password):
        session.permanent = True
        session['authenticated'] = True
        session['username'] = username
        logger.info(f"User '{username}' logged in")
        return jsonify({"success": True, "username": username, "first_login": is_first_login()})
    else:
        logger.warning(f"Failed login attempt for '{username}'")
        return jsonify({"success": False, "error": "invalid_credentials"}), 401


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    username = session.get('username', 'unknown')
    session.clear()
    logger.info(f"User '{username}' logged out")
    return jsonify({"success": True})


@app.route("/api/auth/status")
def api_auth_status():
    return jsonify({
        "authenticated": session.get('authenticated', False),
        "username": session.get('username', None),
        "first_login": is_first_login() if session.get('authenticated') else False
    })


@app.route("/api/auth/change-password", methods=["POST"])
def api_change_password():
    if not session.get('authenticated'):
        return jsonify({"success": False, "error": "Not authenticated"}), 401

    data = request.json or {}
    current_pwd = data.get("current_password", "")
    new_pwd = data.get("new_password", "")

    username = session.get('username', 'admin')
    success, message = change_password(username, current_pwd, new_pwd)

    if success:
        logger.info(f"User '{username}' changed password")
    else:
        logger.warning(f"Password change failed for '{username}': {message}")

    return jsonify({"success": success, "message": message})


# ─── Auth Middleware ──────────────────────────────────────────────

@app.before_request
def require_auth():
    """Protect all /api/ routes except auth endpoints."""
    if request.path.startswith('/api/') and not request.path.startswith('/api/auth/'):
        if not session.get('authenticated'):
            return jsonify({'success': False, 'error': 'Not authenticated', 'auth_required': True}), 401


# ─── Pages ────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ─── API: Token Management ───────────────────────────────────────

@app.route("/api/token", methods=["POST"])
def set_token():
    data = request.json
    token = data.get("token", "").strip()
    if not token:
        return jsonify({"success": False, "error": "Token không được để trống"})

    success, result = ddns.set_api_token(token)
    if success:
        return jsonify({"success": True, "message": "Token hợp lệ và đã lưu"})
    return jsonify({"success": False, "error": "Token không hợp lệ", "details": result})


@app.route("/api/token", methods=["GET"])
def get_token():
    return jsonify({
        "success": True,
        "token": ddns.get_api_token(),
        "has_token": bool(ddns.config.get("api_token", ""))
    })


@app.route("/api/token/verify", methods=["GET"])
def verify_token():
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình token"})
    success, data = ddns.cf.verify_token()
    return jsonify({"success": success, "data": data})


# ─── API: Zone (Domain) Management ───────────────────────────────

@app.route("/api/zones", methods=["GET"])
def list_zones():
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    success, zones, info = ddns.cf.list_zones()
    if success:
        zone_list = []
        for z in zones:
            zone_list.append({
                "id": z["id"],
                "name": z["name"],
                "status": z["status"],
                "name_servers": z.get("name_servers", []),
                "original_name_servers": z.get("original_name_servers", []),
                "plan": z.get("plan", {}).get("name", "Free"),
                "type": z.get("type", "full"),
                "paused": z.get("paused", False)
            })
        return jsonify({"success": True, "zones": zone_list, "info": info})
    return jsonify({"success": False, "error": str(zones)})


@app.route("/api/zones", methods=["POST"])
def add_zone():
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    data = request.json
    domain = data.get("domain", "").strip()
    if not domain:
        return jsonify({"success": False, "error": "Tên miền không được để trống"})

    # Get account ID
    acc_success, accounts = ddns.cf.list_accounts()
    account_id = None
    if acc_success and accounts:
        account_id = accounts[0]["id"]

    success, result = ddns.cf.add_zone(domain, account_id=account_id)
    if success:
        return jsonify({
            "success": True,
            "zone": {
                "id": result["id"],
                "name": result["name"],
                "status": result["status"],
                "name_servers": result.get("name_servers", []),
                "original_name_servers": result.get("original_name_servers", [])
            },
            "message": f"Đã thêm domain {domain} thành công!"
        })
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/zones/<zone_id>", methods=["DELETE"])
def delete_zone(zone_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    success, data = ddns.cf.delete_zone(zone_id)
    if success:
        return jsonify({"success": True, "message": "Đã xóa domain"})
    return jsonify({"success": False, "error": str(data)})


@app.route("/api/zones/<zone_id>", methods=["GET"])
def get_zone_details(zone_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    success, result = ddns.cf.get_zone_details(zone_id)
    if success:
        return jsonify({"success": True, "zone": result})
    return jsonify({"success": False, "error": str(result)})


# ─── API: DNS Record Management ──────────────────────────────────

@app.route("/api/zones/<zone_id>/records", methods=["GET"])
def list_records(zone_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    record_type = request.args.get("type")
    success, records, info = ddns.cf.list_dns_records(zone_id, record_type=record_type)
    if success:
        record_list = []
        for r in records:
            record_list.append({
                "id": r["id"],
                "type": r["type"],
                "name": r["name"],
                "content": r["content"],
                "ttl": r["ttl"],
                "proxied": r.get("proxied", False),
                "priority": r.get("priority"),
                "created_on": r.get("created_on", ""),
                "modified_on": r.get("modified_on", "")
            })
        return jsonify({"success": True, "records": record_list, "info": info})
    return jsonify({"success": False, "error": str(records)})


@app.route("/api/zones/<zone_id>/records", methods=["POST"])
def create_record(zone_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    data = request.json
    record_type = data.get("type", "A")
    name = data.get("name", "").strip()
    content = data.get("content", "").strip()
    ttl = data.get("ttl", 1)
    proxied = data.get("proxied", False)
    priority = data.get("priority")

    if not name or not content:
        return jsonify({"success": False, "error": "Tên và nội dung không được để trống"})

    success, result = ddns.cf.create_dns_record(
        zone_id, record_type, name, content, ttl, proxied, priority
    )
    if success:
        return jsonify({"success": True, "record": result, "message": "Đã tạo record thành công"})
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/zones/<zone_id>/records/<record_id>", methods=["PUT"])
def update_record(zone_id, record_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    data = request.json
    record_type = data.get("type", "A")
    name = data.get("name", "").strip()
    content = data.get("content", "").strip()
    ttl = data.get("ttl", 1)
    proxied = data.get("proxied", False)
    priority = data.get("priority")

    success, result = ddns.cf.update_dns_record(
        zone_id, record_id, record_type, name, content, ttl, proxied, priority
    )
    if success:
        return jsonify({"success": True, "record": result, "message": "Đã cập nhật record"})
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/zones/<zone_id>/records/<record_id>", methods=["DELETE"])
def delete_record(zone_id, record_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    success, data = ddns.cf.delete_dns_record(zone_id, record_id)
    if success:
        return jsonify({"success": True, "message": "Đã xóa record"})
    return jsonify({"success": False, "error": str(data)})


# ─── API: DDNS Service ───────────────────────────────────────────

@app.route("/api/ddns/status", methods=["GET"])
def ddns_status():
    status = ddns.get_status()
    return jsonify({"success": True, **status})


@app.route("/api/ddns/start", methods=["POST"])
def ddns_start():
    success, message = ddns.start()
    return jsonify({"success": success, "message": message})


@app.route("/api/ddns/stop", methods=["POST"])
def ddns_stop():
    success, message = ddns.stop()
    return jsonify({"success": success, "message": message})


@app.route("/api/ddns/update", methods=["POST"])
def ddns_force_update():
    data = request.json or {}
    force = data.get("force", True)
    success, message = ddns.update_ip(force=force)
    return jsonify({"success": success, "message": message})


@app.route("/api/ddns/records", methods=["GET"])
def ddns_records():
    records = ddns.get_ddns_records()
    return jsonify({"success": True, "records": records})


@app.route("/api/ddns/records", methods=["POST"])
def ddns_add_record():
    data = request.json
    success = ddns.add_ddns_record(
        zone_id=data.get("zone_id"),
        zone_name=data.get("zone_name"),
        record_id=data.get("record_id"),
        record_name=data.get("record_name"),
        record_type=data.get("record_type", "A")
    )
    if success:
        return jsonify({"success": True, "message": "Đã thêm record vào DDNS"})
    return jsonify({"success": False, "error": "Record đã tồn tại trong DDNS"})


@app.route("/api/ddns/records/<record_id>", methods=["DELETE"])
def ddns_remove_record(record_id):
    ddns.remove_ddns_record(record_id)
    return jsonify({"success": True, "message": "Đã xóa record khỏi DDNS"})


@app.route("/api/ddns/interval", methods=["POST"])
def ddns_set_interval():
    data = request.json
    seconds = data.get("interval", 300)
    ddns.set_interval(seconds)
    return jsonify({"success": True, "message": f"Đã đặt interval: {seconds}s"})


@app.route("/api/ddns/logs", methods=["GET"])
def ddns_logs():
    limit = request.args.get("limit", 50, type=int)
    logs = ddns.get_logs(limit)
    return jsonify({"success": True, "logs": logs})


@app.route("/api/ip", methods=["GET"])
def get_current_ip():
    ip = CloudflareAPI.get_public_ip()
    return jsonify({"success": True, "ip": ip or "Không thể lấy IP"})


# ─── API: Cloudflare Tunnels ─────────────────────────────────────

def _get_account_id():
    """Helper to get the first account ID from the token."""
    acc_success, accounts = ddns.cf.list_accounts()
    if acc_success and accounts:
        return accounts[0]["id"]
    return None


@app.route("/api/tunnels", methods=["GET"])
def list_tunnels():
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    success, tunnels = ddns.cf.list_tunnels(account_id)
    if success:
        tunnel_list = []
        for t in tunnels:
            conns = t.get("connections", [])
            tunnel_list.append({
                "id": t["id"],
                "name": t.get("name", ""),
                "status": t.get("status", "inactive"),
                "created_at": t.get("created_at", ""),
                "connections": [{
                    "id": c.get("id", ""),
                    "is_pending_reconnect": c.get("is_pending_reconnect", False),
                    "origin_ip": c.get("origin_ip", ""),
                    "opened_at": c.get("opened_at", "")
                } for c in conns] if conns else []
            })
        return jsonify({"success": True, "tunnels": tunnel_list, "account_id": account_id})
    return jsonify({"success": False, "error": str(tunnels)})


@app.route("/api/tunnels", methods=["POST"])
def create_tunnel():
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    data = request.json
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "Tên tunnel không được để trống"})

    success, result = ddns.cf.create_tunnel(account_id, name)
    if success:
        return jsonify({
            "success": True,
            "tunnel": {
                "id": result["id"],
                "name": result.get("name", ""),
                "status": result.get("status", "inactive"),
                "created_at": result.get("created_at", ""),
                "token": result.get("token", "")
            },
            "message": f"Đã tạo tunnel '{name}' thành công!"
        })
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/tunnels/<tunnel_id>", methods=["GET"])
def get_tunnel_detail(tunnel_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    success, result = ddns.cf.get_tunnel(account_id, tunnel_id)
    if success:
        return jsonify({"success": True, "tunnel": result})
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/tunnels/<tunnel_id>", methods=["DELETE"])
def delete_tunnel(tunnel_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    import time

    steps = []

    # Step 1: Get tunnel info (name, config)
    tunnel_name = ""
    t_success, t_data = ddns.cf.get_tunnel(account_id, tunnel_id)
    if t_success and t_data.get("result"):
        tunnel_name = t_data["result"].get("name", "")

    # Step 2: Stop Docker connector
    if tunnel_name:
        stop_ok, stop_msg = _stop_connector(tunnel_name)
        if stop_ok:
            steps.append(f"Đã dừng connector Docker ({tunnel_name})")
        # Wait a moment for connections to close
        time.sleep(2)

    # Step 3: Clean up DNS records
    zones_data = ddns.cf.list_zones()
    if zones_data[0]:
        for zone in zones_data[1]:
            ddns.cf.cleanup_tunnel_dns(zone["id"], tunnel_id)
        steps.append("Đã dọn DNS records")

    # Step 4: Try to delete tunnel (with retries)
    max_retries = 3
    for attempt in range(max_retries):
        success, data = ddns.cf.delete_tunnel(account_id, tunnel_id)
        if success:
            steps.append("Đã xóa tunnel")
            return jsonify({
                "success": True,
                "message": f"Đã xóa tunnel{' ' + tunnel_name if tunnel_name else ''}",
                "steps": steps
            })

        # Check if it's the "active connections" error
        errors = data.get("errors", [])
        is_active_conn = any(e.get("code") == 1022 for e in errors)

        if is_active_conn and attempt < max_retries - 1:
            # Wait and retry
            wait_time = (attempt + 1) * 5  # 5s, 10s
            steps.append(f"Tunnel vẫn có kết nối, đợi {wait_time}s... (lần {attempt + 1})")
            time.sleep(wait_time)
        else:
            # Final failure
            error_msg = errors[0].get("message", str(data)) if errors else str(data)
            if is_active_conn:
                return jsonify({
                    "success": False,
                    "error": "Tunnel vẫn có kết nối đang hoạt động. Hãy dừng connector thủ công (Container Manager → dừng container cloudflared) rồi thử lại.",
                    "steps": steps
                })
            return jsonify({"success": False, "error": error_msg, "steps": steps})


@app.route("/api/tunnels/<tunnel_id>/config", methods=["GET"])
def get_tunnel_config(tunnel_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    success, result = ddns.cf.get_tunnel_configurations(account_id, tunnel_id)
    if success:
        return jsonify({"success": True, "config": result})
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/tunnels/<tunnel_id>/routes/<path:hostname>", methods=["DELETE"])
def delete_tunnel_route(tunnel_id, hostname):
    """Delete a specific route (by hostname) from tunnel ingress config."""
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    # Get current config
    ok, result = ddns.cf.get_tunnel_configurations(account_id, tunnel_id)
    if not ok:
        return jsonify({"success": False, "error": f"Không lấy được config: {result}"})

    # Try multiple paths to find ingress (API response format varies)
    ingress = None
    # Path 1: result.config.ingress (most common)
    if isinstance(result, dict):
        cfg = result.get("config", {})
        if isinstance(cfg, dict):
            ingress = cfg.get("ingress")
            # Path 2: result.config.config.ingress
            if ingress is None:
                inner = cfg.get("config", {})
                if isinstance(inner, dict):
                    ingress = inner.get("ingress")

    if not ingress:
        logger.warning(f"Cannot find ingress in config. Keys: {list(result.keys()) if isinstance(result, dict) else type(result)}")
        return jsonify({"success": False, "error": "Không tìm thấy cấu hình ingress"})

    original_count = len([r for r in ingress if r.get("hostname")])

    # Remove the route with matching hostname
    new_ingress = [r for r in ingress if r.get("hostname", "") != hostname]
    # Keep catch-all at end
    if not any(not r.get("hostname") for r in new_ingress):
        new_ingress.append({"service": "http_status:404"})

    if len([r for r in new_ingress if r.get("hostname")]) == original_count:
        return jsonify({"success": False, "error": f"Không tìm thấy route '{hostname}'"})

    # Update config
    ok, result = ddns.cf.put_tunnel_configurations(
        account_id, tunnel_id, {"ingress": new_ingress}
    )
    if not ok:
        return jsonify({"success": False, "error": f"Lỗi cập nhật config: {result}"})

    # Also delete CNAME DNS record for this hostname
    try:
        zones_ok, zones = ddns.cf.list_zones()
        if zones_ok:
            for zone in zones:
                zone_name = zone.get("name", "")
                if hostname.endswith(zone_name):
                    recs_ok, recs = ddns.cf.list_dns_records(zone["id"])
                    if recs_ok:
                        for rec in recs:
                            if rec.get("name") == hostname and rec.get("type") == "CNAME":
                                ddns.cf.delete_dns_record(zone["id"], rec["id"])
                                logger.info(f"Deleted CNAME DNS for {hostname}")
    except Exception as e:
        logger.warning(f"Could not delete DNS for {hostname}: {e}")

    return jsonify({
        "success": True,
        "message": f"Đã xóa route '{hostname}'",
        "remaining_routes": len([r for r in new_ingress if r.get("hostname")])
    })




@app.route("/api/tunnels/<tunnel_id>/config", methods=["PUT"])
def update_tunnel_config(tunnel_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    data = request.json
    config = data.get("config", {})

    success, result = ddns.cf.put_tunnel_configurations(account_id, tunnel_id, config)
    if success:
        return jsonify({"success": True, "config": result, "message": "Đã cập nhật cấu hình tunnel"})
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/tunnels/<tunnel_id>/token", methods=["GET"])
def get_tunnel_token(tunnel_id):
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    success, result = ddns.cf.get_tunnel_token(account_id, tunnel_id)
    if success:
        return jsonify({"success": True, "token": result})
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/tunnels/<tunnel_id>/dns", methods=["POST"])
def add_tunnel_dns(tunnel_id):
    """Create a CNAME record pointing to the tunnel."""
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    data = request.json
    zone_id = data.get("zone_id", "").strip()
    hostname = data.get("hostname", "").strip()

    if not zone_id or not hostname:
        return jsonify({"success": False, "error": "Zone ID và hostname không được để trống"})

    tunnel_target = f"{tunnel_id}.cfargotunnel.com"
    success, result = ddns.cf.create_dns_record(
        zone_id, "CNAME", hostname, tunnel_target, ttl=1, proxied=True
    )
    if success:
        return jsonify({"success": True, "record": result, "message": f"Đã tạo DNS cho {hostname} → tunnel"})
    return jsonify({"success": False, "error": str(result)})


@app.route("/api/tunnels/quick-setup", methods=["POST"])
def quick_setup_tunnel():
    """
    All-in-one tunnel setup:
    1. Create tunnel
    2. Configure ingress rules
    3. Create DNS CNAME records
    4. Return connector token
    """
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    data = request.json
    tunnel_name = data.get("name", "").strip()
    routes = data.get("routes", [])  # [{zone_id, hostname, service}]

    if not tunnel_name:
        return jsonify({"success": False, "error": "Tên tunnel không được để trống"})

    if not routes or len(routes) == 0:
        return jsonify({"success": False, "error": "Cần ít nhất 1 route"})

    steps = []
    errors = []

    # Step 1: Create tunnel
    success, result = ddns.cf.create_tunnel(account_id, tunnel_name)
    if not success:
        return jsonify({"success": False, "error": f"Lỗi tạo tunnel: {result}", "steps": steps})
    tunnel_id = result["id"]
    steps.append({"step": "create_tunnel", "status": "ok", "message": f"Đã tạo tunnel '{tunnel_name}'"})

    # Step 2: Configure ingress rules
    ingress = []
    for route in routes:
        hostname = route.get("hostname", "").strip()
        service = route.get("service", "").strip()
        if hostname and service:
            ingress.append({"hostname": hostname, "service": service})
    ingress.append({"service": "http_status:404"})  # catch-all

    config = {"ingress": ingress}
    cfg_success, cfg_result = ddns.cf.put_tunnel_configurations(account_id, tunnel_id, config)
    if cfg_success:
        steps.append({"step": "configure_ingress", "status": "ok", "message": f"Đã cấu hình {len(ingress)-1} route(s)"})
    else:
        errors.append(f"Lỗi cấu hình ingress: {cfg_result}")
        steps.append({"step": "configure_ingress", "status": "error", "message": str(cfg_result)})

    # Step 3: Create DNS CNAME records
    dns_created = 0
    for route in routes:
        zone_id = route.get("zone_id", "").strip()
        hostname = route.get("hostname", "").strip()
        if zone_id and hostname:
            tunnel_target = f"{tunnel_id}.cfargotunnel.com"
            dns_success, dns_result = ddns.cf.create_dns_record(
                zone_id, "CNAME", hostname, tunnel_target, ttl=1, proxied=True
            )
            if dns_success:
                dns_created += 1
            else:
                errors.append(f"Lỗi tạo DNS cho {hostname}: {dns_result}")
    steps.append({"step": "create_dns", "status": "ok" if dns_created > 0 else "warning",
                  "message": f"Đã tạo {dns_created}/{len(routes)} DNS record(s)"})

    # Step 4: Get connector token
    token = ""
    tok_success, tok_result = ddns.cf.get_tunnel_token(account_id, tunnel_id)
    if tok_success:
        token = tok_result
        steps.append({"step": "get_token", "status": "ok", "message": "Đã lấy connector token"})
    else:
        errors.append(f"Lỗi lấy token: {tok_result}")
        steps.append({"step": "get_token", "status": "error", "message": str(tok_result)})

    # Step 5: Auto-start connector via Docker
    auto_started = False
    if token and _check_docker():
        start_ok, start_msg = _start_connector(tunnel_name, token)
        if start_ok:
            auto_started = True
            steps.append({"step": "start_connector", "status": "ok",
                          "message": "Đã tự động chạy connector qua Docker 🐳"})
        else:
            steps.append({"step": "start_connector", "status": "warning",
                          "message": f"Không thể tự động chạy: {start_msg}"})
    elif token:
        steps.append({"step": "start_connector", "status": "warning",
                      "message": "Docker không khả dụng - hãy chạy connector thủ công"})

    return jsonify({
        "success": True,
        "tunnel_id": tunnel_id,
        "tunnel_name": tunnel_name,
        "token": token,
        "auto_started": auto_started,
        "steps": steps,
        "errors": errors,
        "message": f"Đã thiết lập tunnel '{tunnel_name}' thành công!"
    })


@app.route("/api/tunnels/<tunnel_id>/add-route", methods=["POST"])
def add_tunnel_route(tunnel_id):
    """Add a new route to an existing tunnel (update ingress + create DNS)."""
    if not ddns.config.get("api_token"):
        return jsonify({"success": False, "error": "Chưa cấu hình API Token"})

    account_id = _get_account_id()
    if not account_id:
        return jsonify({"success": False, "error": "Không thể lấy Account ID"})

    data = request.json
    hostname = data.get("hostname", "").strip()
    service = data.get("service", "").strip()
    zone_id = data.get("zone_id", "").strip()

    if not hostname or not service:
        return jsonify({"success": False, "error": "Hostname và Service không được để trống"})

    # Get existing config
    existing_ingress = []
    cfg_success, cfg_result = ddns.cf.get_tunnel_configurations(account_id, tunnel_id)
    if cfg_success and cfg_result.get("config"):
        existing_ingress = cfg_result["config"].get("ingress", [])

    # Build new ingress: existing rules (minus catch-all) + new rule + catch-all
    new_ingress = [r for r in existing_ingress if r.get("hostname")]
    new_ingress.append({"hostname": hostname, "service": service})
    new_ingress.append({"service": "http_status:404"})

    config = {"ingress": new_ingress}
    upd_success, upd_result = ddns.cf.put_tunnel_configurations(account_id, tunnel_id, config)
    if not upd_success:
        return jsonify({"success": False, "error": f"Lỗi cập nhật ingress: {upd_result}"})

    # Create DNS CNAME if zone_id provided
    dns_msg = ""
    if zone_id:
        tunnel_target = f"{tunnel_id}.cfargotunnel.com"
        dns_success, dns_result = ddns.cf.create_dns_record(
            zone_id, "CNAME", hostname, tunnel_target, ttl=1, proxied=True
        )
        if dns_success:
            dns_msg = f" + DNS record cho {hostname}"
        else:
            dns_msg = f" (Lỗi DNS: {dns_result})"

    return jsonify({
        "success": True,
        "message": f"Đã thêm route {hostname} → {service}{dns_msg}"
    })


# ─── API: Cloudflared Connector (Docker) ─────────────────────────

import subprocess
import re as _re

def _safe_container_name(tunnel_name):
    """Generate a safe Docker container name from tunnel name."""
    name = _re.sub(r'[^a-zA-Z0-9_.-]', '-', tunnel_name.lower())
    return f"cloudflared-{name}"


# Cache the Docker binary path
_docker_bin_cache = None

def _find_docker():
    """Find Docker binary on the system (Synology-aware)."""
    global _docker_bin_cache
    if _docker_bin_cache:
        return _docker_bin_cache

    # Search common paths on Synology and Linux
    search_paths = [
        "/usr/local/bin/docker",
        "/usr/bin/docker",
        "/var/packages/ContainerManager/target/usr/bin/docker",
        "/var/packages/Docker/target/usr/bin/docker",
        "/volume1/@appstore/ContainerManager/usr/bin/docker",
        "/volume1/@appstore/Docker/usr/bin/docker",
    ]

    for path in search_paths:
        if os.path.isfile(path):
            _docker_bin_cache = path
            logger.info(f"Docker found at: {path}")
            return path

    # Try 'which docker' as last resort
    try:
        result = subprocess.run(
            ["which", "docker"], capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            path = result.stdout.strip()
            _docker_bin_cache = path
            logger.info(f"Docker found via which: {path}")
            return path
    except Exception:
        pass

    return None


def _docker_cmd(args, timeout=30):
    """Run a Docker command with the found Docker binary. Returns (returncode, stdout, stderr)."""
    docker_bin = _find_docker()
    if not docker_bin:
        return -1, "", "Docker not found"

    # Always try with sudo first (package user needs sudo for docker)
    cmd_sudo = ["sudo", docker_bin] + args

    try:
        result = subprocess.run(cmd_sudo, capture_output=True, text=True, timeout=timeout)
        if result.returncode == 0:
            return 0, result.stdout.strip(), result.stderr.strip()

        # If sudo fails, try direct (in case running as root or docker group member)
        cmd_direct = [docker_bin] + args
        result2 = subprocess.run(cmd_direct, capture_output=True, text=True, timeout=timeout)
        if result2.returncode == 0:
            return 0, result2.stdout.strip(), result2.stderr.strip()

        # Return the more informative error
        err = result.stderr.strip() or result2.stderr.strip()
        return result.returncode, result.stdout.strip(), err
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout"
    except Exception as e:
        return -1, "", str(e)


def _check_docker():
    """Check if Docker is available."""
    docker_bin = _find_docker()
    if not docker_bin:
        return False
    code, _, _ = _docker_cmd(["info"], timeout=10)
    return code == 0


def _get_connector_status(container_name):
    """Get the status of a cloudflared Docker container."""
    code, stdout, stderr = _docker_cmd(
        ["inspect", "-f", "{{.State.Status}}", container_name], timeout=10
    )
    if code == 0 and stdout:
        status = stdout.strip()
        return {"exists": True, "status": status, "running": status == "running"}
    return {"exists": False, "status": "not_found", "running": False}


def _start_connector(tunnel_name, token):
    """Start cloudflared connector as a Docker container."""
    container_name = _safe_container_name(tunnel_name)

    # Stop existing container if any
    _docker_cmd(["rm", "-f", container_name], timeout=15)

    # Run new container
    code, stdout, stderr = _docker_cmd([
        "run", "-d",
        "--name", container_name,
        "--restart", "unless-stopped",
        "--network", "host",
        "cloudflare/cloudflared:latest",
        "tunnel", "--no-autoupdate", "run", "--token", token
    ], timeout=120)

    if code == 0:
        container_id = stdout[:12]
        return True, f"Container {container_name} started ({container_id})"

    # If image not found, pull first then retry
    if "Unable to find image" in stderr or "not found" in stderr.lower():
        logger.info("Pulling cloudflare/cloudflared:latest...")
        pull_code, _, pull_err = _docker_cmd(
            ["pull", "cloudflare/cloudflared:latest"], timeout=180
        )
        if pull_code == 0:
            # Retry run
            code2, stdout2, stderr2 = _docker_cmd([
                "run", "-d",
                "--name", container_name,
                "--restart", "unless-stopped",
                "--network", "host",
                "cloudflare/cloudflared:latest",
                "tunnel", "--no-autoupdate", "run", "--token", token
            ], timeout=60)
            if code2 == 0:
                return True, f"Container {container_name} started"
            return False, stderr2
        return False, f"Cannot pull image: {pull_err}"

    return False, stderr


def _stop_connector(tunnel_name):
    """Stop and remove a cloudflared Docker container."""
    container_name = _safe_container_name(tunnel_name)
    code, stdout, stderr = _docker_cmd(["rm", "-f", container_name], timeout=15)
    return code == 0, stdout or stderr


@app.route("/api/connector/status/<tunnel_name>", methods=["GET"])
def connector_status(tunnel_name):
    """Get the status of a cloudflared connector."""
    docker_ok = _check_docker()
    if not docker_ok:
        return jsonify({
            "success": True,
            "docker_available": False,
            "status": "docker_unavailable",
            "running": False
        })

    container_name = _safe_container_name(tunnel_name)
    status = _get_connector_status(container_name)
    return jsonify({
        "success": True,
        "docker_available": True,
        "container_name": container_name,
        **status
    })


@app.route("/api/connector/start", methods=["POST"])
def connector_start():
    """Start a cloudflared connector via Docker."""
    if not _check_docker():
        return jsonify({"success": False, "error": "Docker không khả dụng trên hệ thống"})

    data = request.json
    tunnel_name = data.get("tunnel_name", "").strip()
    token = data.get("token", "").strip()

    if not tunnel_name or not token:
        return jsonify({"success": False, "error": "Thiếu tunnel_name hoặc token"})

    success, message = _start_connector(tunnel_name, token)
    return jsonify({
        "success": success,
        "message": message if success else None,
        "error": message if not success else None
    })


@app.route("/api/connector/stop", methods=["POST"])
def connector_stop():
    """Stop a cloudflared connector."""
    data = request.json
    tunnel_name = data.get("tunnel_name", "").strip()
    if not tunnel_name:
        return jsonify({"success": False, "error": "Thiếu tunnel_name"})

    success, message = _stop_connector(tunnel_name)
    return jsonify({
        "success": success,
        "message": f"Đã dừng connector {tunnel_name}" if success else None,
        "error": message if not success else None
    })


# ─── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Auto-start DDNS if configured
    if ddns.config.get("api_token") and ddns.config.get("ddns_records"):
        ddns.start()
        logger.info("DDNS service auto-started")

    port = int(os.environ.get("CF_DDNS_PORT", 9797))
    debug = os.environ.get("CF_DDNS_DEBUG", "false").lower() == "true"
    logger.info(f"Starting CF DDNS Manager on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
