"""
═══════════════════════════════════════════════════════════════
Auth Module - Simple File-based Authentication
═══════════════════════════════════════════════════════════════
Uses a local JSON credentials file with bcrypt-style hashing.
Default credentials: admin / admin
"""

import os
import sys
import json
import hashlib
import secrets
from functools import wraps
from flask import session, request, jsonify, redirect

# Add lib/ to path for Synology
lib_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
if os.path.isdir(lib_dir) and lib_dir not in sys.path:
    sys.path.insert(0, lib_dir)

# Credentials file path
_base_dir = os.path.dirname(os.path.abspath(__file__))
CREDS_FILE = os.path.join(_base_dir, 'credentials.json')


def _hash_password(password, salt=None):
    """Hash password with SHA256 + salt."""
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return salt, hashed


def _load_credentials():
    """Load credentials from file, create default if missing."""
    if os.path.isfile(CREDS_FILE):
        try:
            with open(CREDS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    # Create default credentials: admin/admin
    salt, hashed = _hash_password('admin')
    creds = {
        'username': 'admin',
        'password_hash': hashed,
        'salt': salt,
        'first_login': True
    }
    _save_credentials(creds)
    return creds


def _save_credentials(creds):
    """Save credentials to file."""
    try:
        with open(CREDS_FILE, 'w', encoding='utf-8') as f:
            json.dump(creds, f, indent=2)
    except IOError:
        pass


def authenticate(username, password):
    """Authenticate user against stored credentials."""
    if not username or not password:
        return False

    creds = _load_credentials()

    if username != creds.get('username', 'admin'):
        return False

    salt = creds.get('salt', '')
    stored_hash = creds.get('password_hash', '')
    _, input_hash = _hash_password(password, salt)

    return input_hash == stored_hash


def change_password(username, current_password, new_password):
    """Change the user's password. Returns (success, message)."""
    if not current_password or not new_password:
        return False, "Mật khẩu không được trống"

    if len(new_password) < 4:
        return False, "Mật khẩu mới phải có ít nhất 4 ký tự"

    creds = _load_credentials()

    if username != creds.get('username', 'admin'):
        return False, "Tài khoản không hợp lệ"

    # Verify current password
    salt = creds.get('salt', '')
    stored_hash = creds.get('password_hash', '')
    _, input_hash = _hash_password(current_password, salt)

    if input_hash != stored_hash:
        return False, "Mật khẩu hiện tại không đúng"

    # Set new password
    new_salt, new_hash = _hash_password(new_password)
    creds['password_hash'] = new_hash
    creds['salt'] = new_salt
    creds['first_login'] = False
    _save_credentials(creds)

    return True, "Đã đổi mật khẩu thành công"


def is_first_login():
    """Check if this is the first login (password not changed from default)."""
    creds = _load_credentials()
    return creds.get('first_login', True)


def login_required(f):
    """Decorator to protect routes - requires authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'success': False, 'error': 'Not authenticated', 'auth_required': True}), 401
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated_function


def get_current_user():
    """Get the currently logged-in username."""
    return session.get('username', None)
