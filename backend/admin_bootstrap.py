"""Grant the owner-selected account admin access. Passwords are entered locally."""
import argparse
import getpass
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from app.admin.tls import enable_system_certificates

enable_system_certificates()
load_dotenv()
from app.core.firebase_admin import auth


def save_uid(name, uid):
    path = Path(__file__).with_name(".env")
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    current = {value.strip() for value in os.getenv(name, "").split(",") if value.strip()}
    current.add(uid)
    line = name + "=" + ",".join(sorted(current))
    if re.search(rf"^{name}\s*=", text, re.M):
        text = re.sub(rf"^{name}\s*=.*$", line, text, flags=re.M)
    else:
        text = text.rstrip() + "\n" + line + "\n"
    path.write_text(text, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default="medvisionrx@gmail.com")
    parser.add_argument("--set-password", action="store_true", help="Privately prompt for a new password (at least 6 characters).")
    parser.add_argument("--reviewer", action="store_true", help="Also grant clinical reviewer access; use only for an authorized qualified reviewer.")
    args = parser.parse_args()
    password = None
    if args.set_password:
        password = getpass.getpass("New password (at least 6 characters): ")
        if len(password) < 6:
            raise SystemExit("Firebase requires at least 6 characters. The password 'admin' is too short. Nothing was changed.")
        if password != getpass.getpass("Confirm new password: "):
            raise SystemExit("Passwords did not match. Nothing was changed.")
    try:
        user = auth.get_user_by_email(args.email)
    except auth.UserNotFoundError:
        if not password:
            raise SystemExit("Account not found. Run again with --set-password to create the account privately.")
        user = auth.create_user(email=args.email, password=password, display_name="Administrator")
        password = None
    if password:
        auth.update_user(user.uid, password=password)
        auth.revoke_refresh_tokens(user.uid)
    save_uid("MEDVISION_ADMIN_UIDS", user.uid)
    if args.reviewer:
        save_uid("MEDVISION_REVIEWER_UIDS", user.uid)
    print("Administrator access configured for", args.email)
    print("Restart the backend and open /admin. No password was printed or stored in source code.")


if __name__ == "__main__":
    main()
