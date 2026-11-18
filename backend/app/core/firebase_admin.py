import json
import os

import firebase_admin
from firebase_admin import credentials, auth


# =========================================================
# FIREBASE SERVICE ACCOUNT
# =========================================================

BACKEND_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

SERVICE_ACCOUNT_PATH = os.path.join(
    BACKEND_DIR,
    "firebase-service-account.json",
)


# =========================================================
# INITIALIZE FIREBASE ADMIN
# =========================================================

if not firebase_admin._apps:

    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        raise FileNotFoundError(
            "Firebase service account file not found:\n"
            f"{SERVICE_ACCOUNT_PATH}\n\n"
            "Download the Firebase Admin SDK service-account "
            "JSON file and place it in the backend folder."
        )

    with open(
        SERVICE_ACCOUNT_PATH,
        "r",
        encoding="utf-8",
    ) as file:
        service_account_data = json.load(file)

    credential = credentials.Certificate(
        service_account_data
    )

    firebase_admin.initialize_app(
        credential
    )


# =========================================================
# VERIFY FIREBASE TOKEN
# =========================================================

def verify_firebase_token(
    id_token: str,
) -> dict:
    """
    Verify a Firebase ID token and return
    the decoded Firebase user information.
    """

    if not id_token:
        raise ValueError(
            "Firebase ID token is missing."
        )

    try:
        decoded_token = auth.verify_id_token(
            id_token
        )

        return decoded_token

    except Exception as exc:
        raise ValueError(
            "Invalid or expired Firebase ID token."
        ) from exc