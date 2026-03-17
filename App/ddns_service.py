"""
DDNS (Dynamic DNS) Update Service
Periodically checks the public IP and updates Cloudflare DNS records if changed.
"""

import sys
import os

# Bootstrap: add lib/ directory for Synology package deployment
_base_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(_base_dir, "lib")
if os.path.isdir(_lib_dir) and _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

import json
import time
import logging
from datetime import datetime
from threading import Thread, Event

from cloudflare_api import CloudflareAPI

logger = logging.getLogger(__name__)

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

DEFAULT_CONFIG = {
    "api_token": "",
    "update_interval": 300,  # seconds (5 minutes)
    "ddns_records": [],      # list of {zone_id, zone_name, record_id, record_name, record_type}
    "last_ip": "",
    "last_update": "",
    "update_log": []
}


class DDNSService:
    def __init__(self):
        self.config = self.load_config()
        self.cf = CloudflareAPI(self.config.get("api_token", ""))
        self._stop_event = Event()
        self._thread = None
        self._running = False

    def load_config(self):
        """Load configuration from file."""
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    config = json.load(f)
                # Merge with defaults for any missing keys
                for key, value in DEFAULT_CONFIG.items():
                    if key not in config:
                        config[key] = value
                return config
            except Exception as e:
                logger.error(f"Error loading config: {e}")
        return DEFAULT_CONFIG.copy()

    def save_config(self):
        """Save configuration to file."""
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving config: {e}")

    def set_api_token(self, token):
        """Set and verify the API token."""
        self.cf.set_token(token)
        success, data = self.cf.verify_token()
        if success:
            self.config["api_token"] = token
            self.save_config()
        return success, data

    def get_api_token(self):
        """Get the current API token (masked)."""
        token = self.config.get("api_token", "")
        if token and len(token) > 8:
            return token[:4] + "*" * (len(token) - 8) + token[-4:]
        return token

    def add_ddns_record(self, zone_id, zone_name, record_id, record_name, record_type="A"):
        """Add a DNS record to DDNS monitoring."""
        record = {
            "zone_id": zone_id,
            "zone_name": zone_name,
            "record_id": record_id,
            "record_name": record_name,
            "record_type": record_type
        }
        # Avoid duplicates
        existing = [r for r in self.config["ddns_records"]
                    if r["record_id"] == record_id]
        if not existing:
            self.config["ddns_records"].append(record)
            self.save_config()
            return True
        return False

    def remove_ddns_record(self, record_id):
        """Remove a DNS record from DDNS monitoring."""
        self.config["ddns_records"] = [
            r for r in self.config["ddns_records"]
            if r["record_id"] != record_id
        ]
        self.save_config()

    def get_ddns_records(self):
        """Get all DDNS monitored records."""
        return self.config.get("ddns_records", [])

    def update_ip(self, force=False):
        """Check and update IP if changed."""
        current_ip = CloudflareAPI.get_public_ip()
        if not current_ip:
            self._add_log("error", "Không thể lấy địa chỉ IP công cộng")
            return False, "Không thể lấy địa chỉ IP công cộng"

        last_ip = self.config.get("last_ip", "")
        if current_ip == last_ip and not force:
            self._add_log("info", f"IP không thay đổi: {current_ip}")
            return True, f"IP không thay đổi: {current_ip}"

        # Update all DDNS records
        updated = 0
        errors = []
        for record in self.config.get("ddns_records", []):
            try:
                success, result = self.cf.update_dns_record(
                    zone_id=record["zone_id"],
                    record_id=record["record_id"],
                    record_type=record.get("record_type", "A"),
                    name=record["record_name"],
                    content=current_ip,
                    proxied=record.get("proxied", False)
                )
                if success:
                    updated += 1
                    self._add_log("success", 
                        f"Đã cập nhật {record['record_name']} → {current_ip}")
                else:
                    error_msg = str(result)
                    errors.append(f"{record['record_name']}: {error_msg}")
                    self._add_log("error", 
                        f"Lỗi cập nhật {record['record_name']}: {error_msg}")
            except Exception as e:
                errors.append(f"{record['record_name']}: {str(e)}")
                self._add_log("error", f"Exception: {str(e)}")

        self.config["last_ip"] = current_ip
        self.config["last_update"] = datetime.now().isoformat()
        self.save_config()

        if errors:
            return False, f"Cập nhật {updated} records, {len(errors)} lỗi"
        return True, f"IP đã thay đổi: {last_ip} → {current_ip}, cập nhật {updated} records"

    def _add_log(self, level, message):
        """Add an entry to the update log."""
        log_entry = {
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "level": level,
            "message": message
        }
        if "update_log" not in self.config:
            self.config["update_log"] = []
        self.config["update_log"].insert(0, log_entry)
        # Keep only last 100 entries
        self.config["update_log"] = self.config["update_log"][:100]
        self.save_config()

    def get_logs(self, limit=50):
        """Get recent update logs."""
        return self.config.get("update_log", [])[:limit]

    def get_status(self):
        """Get current DDNS status."""
        return {
            "running": self._running,
            "current_ip": self.config.get("last_ip", "N/A"),
            "last_update": self.config.get("last_update", "Chưa cập nhật"),
            "interval": self.config.get("update_interval", 300),
            "monitored_records": len(self.config.get("ddns_records", [])),
            "has_token": bool(self.config.get("api_token", ""))
        }

    def set_interval(self, seconds):
        """Set the update interval."""
        self.config["update_interval"] = max(60, int(seconds))
        self.save_config()

    # ─── Background Service ──────────────────────────────────────

    def _run_loop(self):
        """Background loop for periodic IP updates."""
        logger.info("DDNS service started")
        while not self._stop_event.is_set():
            try:
                if self.config.get("ddns_records"):
                    self.update_ip()
            except Exception as e:
                logger.error(f"DDNS update error: {e}")
                self._add_log("error", f"Lỗi hệ thống: {str(e)}")

            # Wait for interval or stop event
            interval = self.config.get("update_interval", 300)
            self._stop_event.wait(interval)

        logger.info("DDNS service stopped")

    def start(self):
        """Start the DDNS background service."""
        if self._running:
            return False, "Service đang chạy"

        if not self.config.get("api_token"):
            return False, "Chưa cấu hình API Token"

        self._stop_event.clear()
        self._thread = Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        self._running = True
        self._add_log("info", "DDNS Service đã khởi động")
        return True, "Service đã khởi động"

    def stop(self):
        """Stop the DDNS background service."""
        if not self._running:
            return False, "Service không chạy"

        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._running = False
        self._add_log("info", "DDNS Service đã dừng")
        return True, "Service đã dừng"
