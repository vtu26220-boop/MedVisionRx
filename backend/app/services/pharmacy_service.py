from urllib.parse import quote_plus


# =========================================================
# ONLINE PHARMACY SERVICE
# =========================================================

PHARMACIES = [
    {
        "name": "Tata 1mg",
        "base_url": "https://www.1mg.com/search/all?name=",
    },

    {
        "name": "Apollo Pharmacy",
        "base_url": "https://www.apollopharmacy.in/search-medicines/",
    },

    {
        "name": "PharmEasy",
        "base_url": "https://pharmeasy.in/search/all?name=",
    },

    {
        "name": "Netmeds",
        "base_url": "https://www.netmeds.com/catalogsearch/result?q=",
    },
]


# =========================================================
# CREATE PHARMACY LINK
# =========================================================

def create_pharmacy_link(
    base_url: str,
    medicine_name: str,
) -> str:

    encoded_name = quote_plus(
        medicine_name
    )


    return (
        f"{base_url}"
        f"{encoded_name}"
    )


# =========================================================
# GET PHARMACY OPTIONS
# =========================================================

def get_pharmacy_options(
    medicine_name: str,
) -> list[dict]:

    if not medicine_name:
        return []


    options = []


    for pharmacy in PHARMACIES:

        options.append(
            {
                "store": pharmacy[
                    "name"
                ],

                "url": create_pharmacy_link(
                    pharmacy[
                        "base_url"
                    ],
                    medicine_name,
                ),

                "action": "Search medicine",
            }
        )


    return options


# =========================================================
# COMPATIBILITY FUNCTION
# =========================================================

def search_online_medicine(
    medicine_name: str,
) -> dict:

    options = (
        get_pharmacy_options(
            medicine_name
        )
    )


    return {
        "medicine": medicine_name,
        "availability": "Check on pharmacy",
        "options": options,
    }