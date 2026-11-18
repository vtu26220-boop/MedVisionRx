from copy import deepcopy


# =========================================================
# MEDICINE INFORMATION DATABASE
# =========================================================
#
# This is the initial local medicine knowledge base.
#
# Later this can be replaced/extended with a properly
# licensed medical-information source.
#
# Unknown medicines are NOT automatically guessed.
# =========================================================

MEDICINE_DATABASE = [

    {
        "name": "Metformin",

        "brand_name": "Metformin",

        "generic_name": "Metformin",

        "brand_names": [
            "Metformin",
            "Metformin Hydrochloride",
        ],

        "dosage_form": "Tablet",

        "default_strength": None,

        "drug_class": (
            "Biguanide"
        ),

        "purpose": (
            "Used to help control blood "
            "glucose levels in type 2 diabetes."
        ),

        "side_effects": [
            "Nausea",
            "Diarrhea",
            "Stomach discomfort",
        ],

        "precautions": [
            "Use only as prescribed.",
            "Tell your healthcare professional "
            "about kidney or liver problems.",
        ],
    },


    {
        "name": "Amlodipine",

        "brand_name": "Amlodipine",

        "generic_name": "Amlodipine",

        "brand_names": [
            "Amlodipine",
        ],

        "dosage_form": "Tablet",

        "default_strength": None,

        "drug_class": (
            "Calcium channel blocker"
        ),

        "purpose": (
            "Used to treat high blood pressure "
            "and certain cardiovascular conditions."
        ),

        "side_effects": [
            "Swelling of ankles or feet",
            "Headache",
            "Dizziness",
            "Flushing",
        ],

        "precautions": [
            "Take according to the prescribed schedule.",
            "Tell your healthcare professional "
            "about heart or liver conditions.",
        ],
    },


    {
        "name": "Atorvastatin",

        "brand_name": "Atorvastatin",

        "generic_name": "Atorvastatin",

        "brand_names": [
            "Atorvastatin",
        ],

        "dosage_form": "Tablet",

        "default_strength": None,

        "drug_class": (
            "Statin"
        ),

        "purpose": (
            "Used to lower cholesterol "
            "and reduce cardiovascular risk."
        ),

        "side_effects": [
            "Muscle pain",
            "Headache",
            "Digestive discomfort",
        ],

        "precautions": [
            "Tell your healthcare professional "
            "about liver disease.",
            "Report unexplained muscle pain "
            "or weakness.",
        ],
    },


    {
        "name": "Paracetamol",

        "brand_name": "Paracetamol",

        "generic_name": "Paracetamol",

        "brand_names": [
            "Paracetamol",
            "Acetaminophen",
            "Crocin",
            "Dolo 650",
        ],

        "dosage_form": "Tablet",

        "default_strength": None,

        "drug_class": (
            "Analgesic / antipyretic"
        ),

        "purpose": (
            "Used for relief of pain "
            "and fever."
        ),

        "side_effects": [
            "Nausea",
            "Stomach discomfort",
        ],

        "precautions": [
            "Do not exceed the prescribed dose.",
            "Tell your healthcare professional "
            "about liver disease or heavy alcohol use.",
        ],
    },


    {
        "name": "Ibuprofen",

        "brand_name": "Ibuprofen",

        "generic_name": "Ibuprofen",

        "brand_names": [
            "Ibuprofen",
        ],

        "dosage_form": "Tablet",

        "default_strength": None,

        "drug_class": (
            "NSAID"
        ),

        "purpose": (
            "Used for pain, inflammation "
            "and fever."
        ),

        "side_effects": [
            "Stomach irritation",
            "Nausea",
            "Heartburn",
        ],

        "precautions": [
            "Tell your healthcare professional "
            "about stomach ulcers, kidney disease "
            "or cardiovascular conditions.",
        ],
    },


    {
        "name": "Azithromycin",

        "brand_name": "Azithromycin",

        "generic_name": "Azithromycin",

        "brand_names": [
            "Azithromycin",
        ],

        "dosage_form": "Tablet",

        "default_strength": None,

        "drug_class": (
            "Macrolide antibiotic"
        ),

        "purpose": (
            "Antibiotic used for certain "
            "bacterial infections."
        ),

        "side_effects": [
            "Nausea",
            "Diarrhea",
            "Abdominal discomfort",
        ],

        "precautions": [
            "Use antibiotics only when prescribed.",
            "Complete the prescribed course unless "
            "your healthcare professional advises otherwise.",
        ],
    },


    {
        "name": "Amoxicillin",

        "brand_name": "Amoxicillin",

        "generic_name": "Amoxicillin",

        "brand_names": [
            "Amoxicillin",
        ],

        "dosage_form": "Capsule",

        "default_strength": None,

        "drug_class": (
            "Penicillin antibiotic"
        ),

        "purpose": (
            "Antibiotic used for certain "
            "bacterial infections."
        ),

        "side_effects": [
            "Nausea",
            "Diarrhea",
            "Skin rash",
        ],

        "precautions": [
            "Tell your healthcare professional "
            "if you have a history of penicillin allergy.",
        ],
    },

]


# =========================================================
# GET CATALOG
# =========================================================

def get_medicine_catalog() -> list[dict]:
    """
    Return medicine records used by the prescription parser.

    A deep copy prevents other services from accidentally
    modifying the master database.
    """

    return deepcopy(
        MEDICINE_DATABASE
    )


# =========================================================
# GET MEDICINE INFORMATION
# =========================================================

def get_medicine_info(
    name: str,
) -> dict:

    if not name:

        return {
            "found": False,
            "medicine_name": name,
            "generic_name": None,
            "message": (
                "Medicine name was not provided."
            ),
        }


    search_name = (
        name
        .strip()
        .lower()
    )


    for medicine in (
        MEDICINE_DATABASE
    ):

        candidates = [
            medicine.get(
                "name",
                "",
            ),

            medicine.get(
                "brand_name",
                "",
            ),
        ]


        candidates.extend(
            medicine.get(
                "brand_names",
                [],
            )
        )


        normalized_candidates = [
            str(candidate)
            .strip()
            .lower()
            for candidate in candidates
            if candidate
        ]


        if search_name in normalized_candidates:

            result = deepcopy(
                medicine
            )

            result["found"] = True

            return result


    # -----------------------------------------------------
    # UNKNOWN MEDICINE
    # -----------------------------------------------------

    return {

        "found": False,

        "medicine_name": name,

        "generic_name": None,

        "drug_class": None,

        "purpose": None,

        "side_effects": [],

        "precautions": [],

        "message": (
            "This medicine is not present "
            "in the current verified local "
            "knowledge base."
        ),

        "needs_verification": True,
    }


# =========================================================
# ENRICH PARSED MEDICINE
# =========================================================

def enrich_medicine(
    medicine: dict,
) -> dict:

    medicine_name = (
        medicine.get(
            "medicine_name"
        )
    )


    information = (
        get_medicine_info(
            medicine_name
        )
    )


    enriched = {
        **medicine,
    }


    if information.get(
        "found"
    ):

        enriched[
            "generic_name"
        ] = (
            medicine.get(
                "generic_name"
            )
            or information.get(
                "generic_name"
            )
        )


        enriched[
            "drug_class"
        ] = information.get(
            "drug_class"
        )


        enriched[
            "purpose"
        ] = information.get(
            "purpose"
        )


        enriched[
            "side_effects"
        ] = information.get(
            "side_effects",
            [],
        )


        enriched[
            "precautions"
        ] = information.get(
            "precautions",
            [],
        )


        enriched[
            "needs_verification"
        ] = medicine.get(
            "needs_verification",
            False,
        )


    else:

        enriched[
            "generic_name"
        ] = None


        enriched[
            "drug_class"
        ] = None


        enriched[
            "purpose"
        ] = None


        enriched[
            "side_effects"
        ] = []


        enriched[
            "precautions"
        ] = []


        enriched[
            "needs_verification"
        ] = True


    return enriched


# =========================================================
# ENRICH ALL MEDICINES
# =========================================================

def enrich_medicines(
    medicines: list[dict],
) -> list[dict]:

    return [
        enrich_medicine(
            medicine
        )
        for medicine in medicines
    ]