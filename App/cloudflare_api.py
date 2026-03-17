"""
Cloudflare API v4 Wrapper
Handles all interactions with Cloudflare's API for DNS management.
"""

import requests
import json
import os

class CloudflareAPI:
    BASE_URL = "https://api.cloudflare.com/client/v4"

    def __init__(self, api_token=None):
        self.api_token = api_token
        self.session = requests.Session()
        if api_token:
            self.session.headers.update({
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json"
            })

    def set_token(self, api_token):
        """Update the API token."""
        self.api_token = api_token
        self.session.headers.update({
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        })

    def verify_token(self):
        """Verify that the API token is valid."""
        try:
            resp = self.session.get(f"{self.BASE_URL}/user/tokens/verify")
            data = resp.json()
            return data.get("success", False), data
        except Exception as e:
            return False, {"errors": [{"message": str(e)}]}

    # ─── Zone (Domain) Management ─────────────────────────────────

    def list_zones(self, page=1, per_page=50):
        """List all zones (domains) in the account."""
        try:
            resp = self.session.get(
                f"{self.BASE_URL}/zones",
                params={"page": page, "per_page": per_page}
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", []), data.get("result_info", {})
            return False, data.get("errors", []), {}
        except Exception as e:
            return False, [{"message": str(e)}], {}

    def add_zone(self, domain_name, account_id=None, jump_start=True):
        """Add a new zone (domain) to Cloudflare."""
        try:
            payload = {
                "name": domain_name,
                "jump_start": jump_start
            }
            if account_id:
                payload["account"] = {"id": account_id}

            resp = self.session.post(f"{self.BASE_URL}/zones", json=payload)
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def delete_zone(self, zone_id):
        """Delete a zone from Cloudflare."""
        try:
            resp = self.session.delete(f"{self.BASE_URL}/zones/{zone_id}")
            data = resp.json()
            return data.get("success", False), data
        except Exception as e:
            return False, {"errors": [{"message": str(e)}]}

    def get_zone_details(self, zone_id):
        """Get details of a specific zone."""
        try:
            resp = self.session.get(f"{self.BASE_URL}/zones/{zone_id}")
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    # ─── DNS Record Management ────────────────────────────────────

    def list_dns_records(self, zone_id, record_type=None, name=None, page=1, per_page=100):
        """List DNS records for a zone."""
        try:
            params = {"page": page, "per_page": per_page}
            if record_type:
                params["type"] = record_type
            if name:
                params["name"] = name

            resp = self.session.get(
                f"{self.BASE_URL}/zones/{zone_id}/dns_records",
                params=params
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", []), data.get("result_info", {})
            return False, data.get("errors", []), {}
        except Exception as e:
            return False, [{"message": str(e)}], {}

    def create_dns_record(self, zone_id, record_type, name, content, ttl=1, proxied=False, priority=None):
        """Create a new DNS record."""
        try:
            payload = {
                "type": record_type,
                "name": name,
                "content": content,
                "ttl": ttl,
                "proxied": proxied
            }
            if priority is not None and record_type == "MX":
                payload["priority"] = priority

            resp = self.session.post(
                f"{self.BASE_URL}/zones/{zone_id}/dns_records",
                json=payload
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def update_dns_record(self, zone_id, record_id, record_type, name, content, ttl=1, proxied=False, priority=None):
        """Update an existing DNS record."""
        try:
            payload = {
                "type": record_type,
                "name": name,
                "content": content,
                "ttl": ttl,
                "proxied": proxied
            }
            if priority is not None and record_type == "MX":
                payload["priority"] = priority

            resp = self.session.put(
                f"{self.BASE_URL}/zones/{zone_id}/dns_records/{record_id}",
                json=payload
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def delete_dns_record(self, zone_id, record_id):
        """Delete a DNS record."""
        try:
            resp = self.session.delete(
                f"{self.BASE_URL}/zones/{zone_id}/dns_records/{record_id}"
            )
            data = resp.json()
            return data.get("success", False), data
        except Exception as e:
            return False, {"errors": [{"message": str(e)}]}

    # ─── Account Management ───────────────────────────────────────

    def list_accounts(self):
        """List accounts the token has access to."""
        try:
            resp = self.session.get(f"{self.BASE_URL}/accounts")
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", [])
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    # ─── Tunnel Management ─────────────────────────────────────────

    def list_tunnels(self, account_id, name=None, is_deleted=False):
        """List all Cloudflare Tunnels for an account."""
        try:
            params = {"is_deleted": str(is_deleted).lower()}
            if name:
                params["name"] = name
            resp = self.session.get(
                f"{self.BASE_URL}/accounts/{account_id}/cfd_tunnel",
                params=params
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", [])
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def create_tunnel(self, account_id, name, tunnel_secret=None):
        """Create a new Cloudflare Tunnel."""
        import base64
        try:
            if not tunnel_secret:
                import secrets as sec_mod
                tunnel_secret = base64.b64encode(sec_mod.token_bytes(32)).decode()

            payload = {
                "name": name,
                "tunnel_secret": tunnel_secret
            }
            resp = self.session.post(
                f"{self.BASE_URL}/accounts/{account_id}/cfd_tunnel",
                json=payload
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def delete_tunnel(self, account_id, tunnel_id):
        """Delete a Cloudflare Tunnel."""
        try:
            resp = self.session.delete(
                f"{self.BASE_URL}/accounts/{account_id}/cfd_tunnel/{tunnel_id}"
            )
            data = resp.json()
            return data.get("success", False), data
        except Exception as e:
            return False, {"errors": [{"message": str(e)}]}

    def get_tunnel(self, account_id, tunnel_id):
        """Get details of a specific tunnel."""
        try:
            resp = self.session.get(
                f"{self.BASE_URL}/accounts/{account_id}/cfd_tunnel/{tunnel_id}"
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def get_tunnel_configurations(self, account_id, tunnel_id):
        """Get the configuration (ingress rules) for a tunnel."""
        try:
            resp = self.session.get(
                f"{self.BASE_URL}/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations"
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def put_tunnel_configurations(self, account_id, tunnel_id, config):
        """Update the configuration (ingress rules) for a tunnel."""
        try:
            resp = self.session.put(
                f"{self.BASE_URL}/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations",
                json={"config": config}
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", {})
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def get_tunnel_token(self, account_id, tunnel_id):
        """Get the token for a tunnel connector."""
        try:
            resp = self.session.get(
                f"{self.BASE_URL}/accounts/{account_id}/cfd_tunnel/{tunnel_id}/token"
            )
            data = resp.json()
            if data.get("success"):
                return True, data.get("result", "")
            return False, data.get("errors", [])
        except Exception as e:
            return False, [{"message": str(e)}]

    def cleanup_tunnel_dns(self, zone_id, tunnel_id):
        """Remove DNS CNAME records pointing to a tunnel."""
        try:
            tunnel_target = f"{tunnel_id}.cfargotunnel.com"
            success, records, _ = self.list_dns_records(zone_id, record_type="CNAME")
            if success:
                for r in records:
                    if r.get("content") == tunnel_target:
                        self.delete_dns_record(zone_id, r["id"])
            return True, "OK"
        except Exception as e:
            return False, str(e)

    # ─── IP Detection ─────────────────────────────────────────────

    @staticmethod
    def get_public_ip():
        """Get the current public IP address."""
        services = [
            "https://api.ipify.org?format=json",
            "https://ifconfig.me/ip",
            "https://icanhazip.com",
            "https://api.my-ip.io/v2/ip.txt"
        ]
        for service in services:
            try:
                resp = requests.get(service, timeout=10)
                if resp.status_code == 200:
                    if "json" in service:
                        return resp.json().get("ip", "").strip()
                    return resp.text.strip()
            except:
                continue
        return None
