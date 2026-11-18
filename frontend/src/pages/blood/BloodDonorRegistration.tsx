import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  HeartPulse,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";

type ScreeningStatus = "clear" | "review" | "deferred";

interface BloodDonorForm {
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  blood_group: string;
  weight_kg: string;
  last_donation_date: string;
  previous_donations: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  availability: boolean;
  consent: boolean;
}

interface HealthScreening {
  current_fever: boolean;
  current_cold_cough_sore_throat: boolean;
  current_acute_respiratory_problem: boolean;
  currently_feel_unwell: boolean;

  temperature_c: string;
  pulse_bpm: string;
  systolic_bp: string;
  diastolic_bp: string;
  hemoglobin: string;

  skin_disease_at_donation_site: boolean;

  allergy: boolean;
  kidney_disease: boolean;
  endocrine_disease: boolean;
  cancer: boolean;
  mental_illness: boolean;
  diabetes: boolean;
  epilepsy: boolean;
  fainting_attacks: boolean;
  amoebiasis: boolean;
  syphilis: boolean;
  bleeding_disorder: boolean;
  heart_disease: boolean;
  lung_disease: boolean;
  asthma: boolean;
  liver_disease: boolean;
  tuberculosis: boolean;
  polycythemia: boolean;
  abnormal_bp: boolean;
  g6pd_deficiency: boolean;

  taking_medication_now: boolean;
  medicine_last_7_days: boolean;
  antibiotic_last_7_days: boolean;
  medication_details: string;

  alcohol_last_24_hours: boolean;
  currently_under_alcohol_influence: boolean;
  regular_heavy_alcohol_use: boolean;

  blood_transfusion_last_12_months: boolean;
  blood_transfusion_date: string;

  surgery_last_12_months: boolean;
  surgery_date: string;

  accident_last_12_months: boolean;

  vaccination_last_12_months: boolean;
  vaccination_date: string;
  vaccination_type: string;

  rabies_vaccination_last_12_months: boolean;
  rabies_vaccination_date: string;

  tattoo_piercing_acupuncture_last_12_months: boolean;
  tattoo_piercing_acupuncture_date: string;

  animal_bite_last_12_months: boolean;
  animal_bite_date: string;

  jaundice_last_12_months: boolean;
  jaundice_date: string;

  hepatitis_b_c_positive: boolean;
  hepatitis_contact_last_12_months: boolean;
  hepatitis_contact_date: string;

  tb_or_typhoid_last_12_months: boolean;
  tb_typhoid_date: string;

  malaria_or_antimalarial_last_3_years: boolean;
  malaria_date: string;

  dental_procedure_last_6_months: boolean;
  dental_procedure_date: string;

  measles_last_6_months: boolean;
  measles_date: string;

  chickenpox_last_6_months: boolean;
  chickenpox_date: string;

  dengue_last_6_months: boolean;
  dengue_date: string;

  known_hiv_positive: boolean;
  known_blood_borne_infection: boolean;
  non_prescribed_injectable_drug_use: boolean;

  confidential_medical_information: string;
}

interface ScreeningResult {
  status: ScreeningStatus;
  reasons: string[];
  reviewReasons: string[];
}

const initialForm: BloodDonorForm = {
  full_name: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  blood_group: "",
  weight_kg: "",
  last_donation_date: "",
  previous_donations: "0",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  availability: true,
  consent: false,
};

const initialScreening: HealthScreening = {
  current_fever: false,
  current_cold_cough_sore_throat: false,
  current_acute_respiratory_problem: false,
  currently_feel_unwell: false,

  temperature_c: "",
  pulse_bpm: "",
  systolic_bp: "",
  diastolic_bp: "",
  hemoglobin: "",

  skin_disease_at_donation_site: false,

  allergy: false,
  kidney_disease: false,
  endocrine_disease: false,
  cancer: false,
  mental_illness: false,
  diabetes: false,
  epilepsy: false,
  fainting_attacks: false,
  amoebiasis: false,
  syphilis: false,
  bleeding_disorder: false,
  heart_disease: false,
  lung_disease: false,
  asthma: false,
  liver_disease: false,
  tuberculosis: false,
  polycythemia: false,
  abnormal_bp: false,
  g6pd_deficiency: false,

  taking_medication_now: false,
  medicine_last_7_days: false,
  antibiotic_last_7_days: false,
  medication_details: "",

  alcohol_last_24_hours: false,
  currently_under_alcohol_influence: false,
  regular_heavy_alcohol_use: false,

  blood_transfusion_last_12_months: false,
  blood_transfusion_date: "",

  surgery_last_12_months: false,
  surgery_date: "",

  accident_last_12_months: false,

  vaccination_last_12_months: false,
  vaccination_date: "",
  vaccination_type: "",

  rabies_vaccination_last_12_months: false,
  rabies_vaccination_date: "",

  tattoo_piercing_acupuncture_last_12_months: false,
  tattoo_piercing_acupuncture_date: "",

  animal_bite_last_12_months: false,
  animal_bite_date: "",

  jaundice_last_12_months: false,
  jaundice_date: "",

  hepatitis_b_c_positive: false,
  hepatitis_contact_last_12_months: false,
  hepatitis_contact_date: "",

  tb_or_typhoid_last_12_months: false,
  tb_typhoid_date: "",

  malaria_or_antimalarial_last_3_years: false,
  malaria_date: "",

  dental_procedure_last_6_months: false,
  dental_procedure_date: "",

  measles_last_6_months: false,
  measles_date: "",

  chickenpox_last_6_months: false,
  chickenpox_date: "",

  dengue_last_6_months: false,
  dengue_date: "",

  known_hiv_positive: false,
  known_blood_borne_infection: false,
  non_prescribed_injectable_drug_use: false,

  confidential_medical_information: "",
};

function getAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;

  const birth = new Date(dateOfBirth);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference =
    today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function daysSince(dateString: string): number | null {
  if (!dateString) return null;

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return Math.floor(
    (todayStart.getTime() - date.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const BLOOD_DONOR_ID_KEY = "medvisionrx_blood_donor_id";

function donorToForm(donor: Partial<Omit<BloodDonorForm, "weight_kg" | "previous_donations">> & { weight_kg?: string | number | null; previous_donations?: string | number | null }): BloodDonorForm {
  return {
    full_name: donor.full_name ?? "",
    date_of_birth: donor.date_of_birth ?? "",
    gender: donor.gender ?? "",
    phone: donor.phone ?? "",
    email: donor.email ?? "",
    address: donor.address ?? "",
    city: donor.city ?? "",
    state: donor.state ?? "",
    pincode: donor.pincode ?? "",
    blood_group: donor.blood_group ?? "",
    weight_kg:
      donor.weight_kg !== undefined &&
      donor.weight_kg !== null
        ? String(donor.weight_kg)
        : "",
    last_donation_date:
      donor.last_donation_date ?? "",
    previous_donations:
      donor.previous_donations !== undefined &&
      donor.previous_donations !== null
        ? String(donor.previous_donations)
        : "0",
    emergency_contact_name:
      donor.emergency_contact_name ?? "",
    emergency_contact_phone:
      donor.emergency_contact_phone ?? "",
    availability:
      donor.availability !== false,
    consent:
      donor.consent === true,
  };
}

function BloodDonorRegistration() {
  const [form, setForm] =
    useState<BloodDonorForm>(initialForm);

  const [screening, setScreening] =
    useState<HealthScreening>(initialScreening);

  const [view, setView] =
    useState<"form" | "preview">("form");

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [saved, setSaved] = useState(false);

  const [donorId, setDonorId] = useState<string | null>(
    () => localStorage.getItem(BLOOD_DONOR_ID_KEY)
  );

  const [editing, setEditing] = useState(
    () =>
      Boolean(
        localStorage.getItem(BLOOD_DONOR_ID_KEY)
      )
  );

  const [loadingExisting, setLoadingExisting] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDonorId(null);
        setEditing(false);
        setLoadingExisting(false);
        setMessage("Please log in to register as a blood donor.");
        return;
      }

      try {
        setLoadingExisting(true);
        setMessage("");

        const token = await user.getIdToken();
        const response = await fetch(
          `${API_BASE_URL}/api/blood-donors/by-user/${encodeURIComponent(user.uid)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (cancelled) return;

        if (response.status === 404) {
          localStorage.removeItem(BLOOD_DONOR_ID_KEY);
          setDonorId(null);
          setEditing(false);
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.detail || "Unable to load your donor profile.");
        }

        const donor = await response.json();

        if (!donor?.id) {
          throw new Error("The donor record returned by the server has no ID.");
        }

        localStorage.setItem(BLOOD_DONOR_ID_KEY, donor.id);
        setDonorId(donor.id);
        setEditing(true);
        setForm(donorToForm(donor));

        if (donor.health_screening && typeof donor.health_screening === "object") {
          setScreening({
            ...initialScreening,
            ...donor.health_screening,
          });
        }
      } catch (error) {
        console.error("Unable to load existing blood donor:", error);
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your existing donor information. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const age = useMemo(
    () => getAge(form.date_of_birth),
    [form.date_of_birth]
  );

  const screeningResult =
    useMemo<ScreeningResult>(() => {
      const reasons: string[] = [];
      const reviewReasons: string[] = [];

      /*
       * AGE
       */
      if (age !== null) {
        if (age < 18) {
          reasons.push(
            "Donor is below 18 years of age."
          );
        }

        if (age > 65) {
          reasons.push(
            "Donor is above 65 years of age."
          );
        }

        if (
          age > 60 &&
          age <= 65 &&
          Number(form.previous_donations || 0) === 0
        ) {
          reviewReasons.push(
            "First-time donor between 61 and 65 years requires blood-centre medical assessment."
          );
        }
      }

      /*
       * WEIGHT
       */
      const weight = Number(form.weight_kg);

      if (
        form.weight_kg &&
        !Number.isNaN(weight) &&
        weight < 45
      ) {
        reasons.push(
          "Weight is below 45 kg."
        );
      }

      /*
       * CURRENT ILLNESS
       */
      if (screening.current_fever) {
        reasons.push(
          "Current fever reported. Donation should be deferred until the donor is well and afebrile."
        );
      }

      if (
        screening.current_cold_cough_sore_throat
      ) {
        reasons.push(
          "Current cold, cough or sore throat reported. Donation should be deferred until symptoms resolve."
        );
      }

      if (
        screening.current_acute_respiratory_problem
      ) {
        reasons.push(
          "Current acute respiratory problem reported."
        );
      }

      if (screening.currently_feel_unwell) {
        reviewReasons.push(
          "Donor currently feels unwell and requires medical assessment."
        );
      }

      if (
        screening.skin_disease_at_donation_site
      ) {
        reviewReasons.push(
          "Skin problem at the intended phlebotomy site requires assessment."
        );
      }

      /*
       * TEMPERATURE
       */
      if (screening.temperature_c) {
        const temperature = Number(
          screening.temperature_c
        );

        if (
          !Number.isNaN(temperature) &&
          temperature > 37
        ) {
          reasons.push(
            "Recorded temperature is above 37°C."
          );
        }
      } else {
        reviewReasons.push(
          "Temperature must be checked by blood-bank staff."
        );
      }

      /*
       * PULSE
       */
      if (screening.pulse_bpm) {
        const pulse = Number(
          screening.pulse_bpm
        );

        if (
          !Number.isNaN(pulse) &&
          (pulse < 60 || pulse > 100)
        ) {
          reviewReasons.push(
            "Recorded pulse is outside the reference range and requires medical assessment."
          );
        }
      } else {
        reviewReasons.push(
          "Pulse must be checked by blood-bank staff."
        );
      }

      /*
       * BLOOD PRESSURE
       */
      if (
        screening.systolic_bp &&
        screening.diastolic_bp
      ) {
        const systolic = Number(
          screening.systolic_bp
        );

        const diastolic = Number(
          screening.diastolic_bp
        );

        if (
          !Number.isNaN(systolic) &&
          !Number.isNaN(diastolic) &&
          (
            systolic < 100 ||
            systolic > 140 ||
            diastolic < 60 ||
            diastolic > 90
          )
        ) {
          reviewReasons.push(
            "Recorded blood pressure requires medical assessment."
          );
        }
      } else {
        reviewReasons.push(
          "Blood pressure must be checked by blood-bank staff."
        );
      }

      /*
       * HEMOGLOBIN
       */
      if (screening.hemoglobin) {
        const hemoglobin = Number(
          screening.hemoglobin
        );

        if (
          !Number.isNaN(hemoglobin) &&
          hemoglobin < 12.5
        ) {
          reasons.push(
            "Recorded hemoglobin is below 12.5 g/dL."
          );
        }
      } else {
        reviewReasons.push(
          "Hemoglobin must be checked by blood-bank staff."
        );
      }

      /*
       * ALCOHOL
       */
      if (
        screening.alcohol_last_24_hours
      ) {
        reasons.push(
          "Alcohol was consumed within the last 24 hours."
        );
      }

      if (
        screening.currently_under_alcohol_influence
      ) {
        reasons.push(
          "Donor is currently under the influence of alcohol."
        );
      }

      if (
        screening.regular_heavy_alcohol_use
      ) {
        reviewReasons.push(
          "Regular heavy alcohol use requires medical review."
        );
      }

      /*
       * LAST DONATION
       */
      if (form.last_donation_date) {
        const days = daysSince(
          form.last_donation_date
        );

        if (days !== null) {
          const requiredDays =
            form.gender === "Female"
              ? 120
              : 90;

          if (days < requiredDays) {
            reasons.push(
              `Previous whole-blood donation was less than ${requiredDays} days ago.`
            );
          }
        }
      }

      /*
       * MEDICINES
       */
      if (screening.antibiotic_last_7_days) {
        reviewReasons.push(
          "Antibiotics were taken within the last 7 days. Eligibility depends on the reason for treatment and medical counselling."
        );
      }

      if (screening.medicine_last_7_days) {
        reviewReasons.push(
          "Medicine was taken within the last 7 days and requires review."
        );
      }

      if (screening.taking_medication_now) {
        reviewReasons.push(
          "Current medication requires blood-bank medical review."
        );
      }

      /*
       * MEDICAL CONDITIONS
       */
      const conditions = [
        screening.allergy && "allergy",
        screening.kidney_disease &&
          "kidney disease",
        screening.endocrine_disease &&
          "endocrine disease",
        screening.cancer && "cancer",
        screening.mental_illness &&
          "mental illness",
        screening.diabetes && "diabetes",
        screening.epilepsy && "epilepsy",
        screening.fainting_attacks &&
          "fainting attacks",
        screening.amoebiasis && "amoebiasis",
        screening.syphilis && "syphilis",
        screening.bleeding_disorder &&
          "bleeding disorder",
        screening.heart_disease &&
          "heart disease",
        screening.lung_disease &&
          "lung disease",
        screening.asthma && "asthma",
        screening.liver_disease &&
          "liver disease",
        screening.tuberculosis &&
          "tuberculosis",
        screening.polycythemia &&
          "polycythemia",
        screening.abnormal_bp &&
          "high/low blood pressure",
        screening.g6pd_deficiency &&
          "G6PD deficiency",
      ].filter(Boolean);

      if (conditions.length > 0) {
        reviewReasons.push(
          `Reported medical condition(s): ${conditions.join(
            ", "
          )}. Blood-bank medical review is required.`
        );
      }

      /*
       * TRANSFUSION
       */
      if (
        screening.blood_transfusion_last_12_months
      ) {
        reviewReasons.push(
          "Blood transfusion within the last 12 months requires blood-centre review."
        );
      }

      /*
       * SURGERY
       */
      if (screening.surgery_last_12_months) {
        reasons.push(
          "Surgery/operation was reported within the last 12 months."
        );
      }

      if (screening.accident_last_12_months) {
        reviewReasons.push(
          "Significant accident within the last 12 months requires medical review."
        );
      }

      /*
       * TATTOO / PIERCING
       */
      if (
        screening.tattoo_piercing_acupuncture_last_12_months
      ) {
        reasons.push(
          "Tattooing, piercing or acupuncture was reported within the last 12 months."
        );
      }

      /*
       * VACCINATION
       */
      if (
        screening.vaccination_last_12_months
      ) {
        reviewReasons.push(
          "Recent vaccination requires assessment based on the vaccine and timing."
        );
      }

      if (
        screening.rabies_vaccination_last_12_months
      ) {
        reasons.push(
          "Recent rabies vaccination requires deferral/medical assessment."
        );
      }

      if (
        screening.animal_bite_last_12_months
      ) {
        reviewReasons.push(
          "Recent animal bite requires medical assessment."
        );
      }

      /*
       * JAUNDICE / HEPATITIS
       */
      if (
        screening.jaundice_last_12_months
      ) {
        reasons.push(
          "Jaundice was reported within the last 12 months."
        );
      }

      if (screening.hepatitis_b_c_positive) {
        reasons.push(
          "Known Hepatitis B/C history requires medical assessment before donation."
        );
      }

      if (
        screening.hepatitis_contact_last_12_months
      ) {
        reviewReasons.push(
          "Recent close contact with jaundice requires medical review."
        );
      }

      /*
       * TB / TYPHOID
       */
      if (
        screening.tb_or_typhoid_last_12_months
      ) {
        reasons.push(
          "Tuberculosis or typhoid was reported within the last 12 months."
        );
      }

      /*
       * MALARIA
       */
      if (
        screening.malaria_or_antimalarial_last_3_years
      ) {
        reviewReasons.push(
          "Malaria or antimalarial treatment within the last 3 years requires medical review."
        );
      }

      /*
       * RECENT CONDITIONS
       */
      if (
        screening.dental_procedure_last_6_months
      ) {
        reviewReasons.push(
          "Recent dental procedure requires blood-centre assessment."
        );
      }

      if (screening.measles_last_6_months) {
        reviewReasons.push(
          "Measles within the last 6 months requires medical review."
        );
      }

      if (
        screening.chickenpox_last_6_months
      ) {
        reviewReasons.push(
          "Chickenpox within the last 6 months requires medical review."
        );
      }

      if (screening.dengue_last_6_months) {
        reviewReasons.push(
          "Dengue within the last 6 months requires medical review."
        );
      }

      /*
       * INFECTION / DRUG HISTORY
       */
      if (screening.known_hiv_positive) {
        reasons.push(
          "Known HIV-positive status was reported."
        );
      }

      if (
        screening.known_blood_borne_infection
      ) {
        reasons.push(
          "Known blood-borne infection was reported."
        );
      }

      if (
        screening.non_prescribed_injectable_drug_use
      ) {
        reviewReasons.push(
          "Non-prescribed injectable drug use requires confidential medical assessment."
        );
      }

      let status: ScreeningStatus = "clear";

      if (reasons.length > 0) {
        status = "deferred";
      } else if (reviewReasons.length > 0) {
        status = "review";
      }

      return {
        status,
        reasons,
        reviewReasons,
      };
    }, [form, screening, age]);

  const handleFormChange = (
    event: ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } =
      event.target;

    const checked =
      type === "checkbox"
        ? (
            event.target as HTMLInputElement
          ).checked
        : undefined;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleScreeningChange = (
    event: ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } =
      event.target;

    const checked =
      type === "checkbox"
        ? (
            event.target as HTMLInputElement
          ).checked
        : undefined;

    setScreening((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const setScreeningBoolean = (
    name: keyof HealthScreening,
    value: boolean
  ) => {
    setScreening((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePreview = () => {
    setMessage("");

    if (!form.full_name.trim()) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!form.date_of_birth) {
      setMessage("Please enter your date of birth.");
      return;
    }

    if (age !== null && age < 18) {
      setMessage(
        "Registration cannot continue because the donor is below 18 years."
      );
      return;
    }

    if (age !== null && age > 65) {
      setMessage(
        "Registration cannot continue because the donor is above 65 years."
      );
      return;
    }

    if (!form.gender) {
      setMessage("Please select gender.");
      return;
    }

    if (!form.blood_group) {
      setMessage("Please select blood group.");
      return;
    }

    if (
      !form.weight_kg ||
      Number(form.weight_kg) <= 0
    ) {
      setMessage("Please enter a valid weight.");
      return;
    }

    if (
      !form.phone ||
      !/^\d{10}$/.test(form.phone)
    ) {
      setMessage(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!form.consent) {
      setMessage(
        "Please accept the donor declaration and consent."
      );
      return;
    }

    setView("preview");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please log in to save your blood donor registration.");
      }

      const userId = user.uid;
      const token = await user.getIdToken();

      /*
       * Re-check the authenticated user's donor profile before
       * choosing POST/PUT. The backend verifies ownership from the token.
       */
      let existingDonorId = donorId;

      if (!existingDonorId) {
        const ownerResponse = await fetch(
          `${API_BASE_URL}/api/blood-donors/by-user/${encodeURIComponent(userId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (ownerResponse.ok) {
          const ownerDonor = await ownerResponse.json();
          if (ownerDonor?.id) {
            existingDonorId = ownerDonor.id;
            setDonorId(ownerDonor.id);
            localStorage.setItem(BLOOD_DONOR_ID_KEY, ownerDonor.id);
          }
        } else if (ownerResponse.status !== 404) {
          const data = await ownerResponse.json().catch(() => ({}));
          throw new Error(data?.detail || "Unable to verify your donor profile.");
        }
      }

      const payload = {
        user_id: userId,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        phone: form.phone,
        email: form.email || null,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        blood_group: form.blood_group,
        weight_kg: Number(form.weight_kg),
        last_donation_date:
          form.last_donation_date || null,
        previous_donations:
          Number(form.previous_donations || 0),
        availability: form.availability,
        consent: form.consent,
        emergency_contact_name:
          form.emergency_contact_name,
        emergency_contact_phone:
          form.emergency_contact_phone,

        pre_screening_status:
          screeningResult.status,

        pre_screening_reasons:
          screeningResult.reasons,

        medical_review_reasons:
          screeningResult.reviewReasons,

        health_screening: screening,
      };

      const url = existingDonorId
        ? `${API_BASE_URL}/api/blood-donors/${encodeURIComponent(
            existingDonorId
          )}`
        : `${API_BASE_URL}/api/blood-donors/`;

      const response = await fetch(url, {
        method: existingDonorId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to save donor registration."
        );
      }

      if (!data?.id) {
        throw new Error(
          "The server did not return a donor ID."
        );
      }

      localStorage.setItem(
        BLOOD_DONOR_ID_KEY,
        data.id
      );

      setDonorId(data.id);
      setEditing(true);
      setSaved(true);

      setMessage(
        existingDonorId
          ? "Blood donor information updated successfully."
          : "Blood donor registration saved successfully."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  };


  const startNewRegistration = () => {
    setMessage("");
    setView("form");

    // A user is allowed only one blood donor profile.
    // "Edit Donor Information" is therefore replaced by
    // returning to the same editable profile.
    setSaved(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  

  if (loadingExisting) {
    return (
      <div className="blood-registration-page">
        <div className="success-card">
          <div className="success-icon">
            <ClipboardCheck size={42} />
          </div>
          <h1>Loading Donor Information</h1>
          <p>
            Checking whether you already have a blood
            donor registration.
          </p>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="blood-registration-page">
        <div className="success-card">

          <div className="success-icon">
            <CheckCircle2 size={42} />
          </div>

          <h1>
            {editing
              ? "Blood Donor Profile Updated"
              : "Blood Donor Profile Saved"}
          </h1>

          <p>
            {editing
              ? "Your blood donor information has been updated successfully in MedVisionRx."
              : "Your blood donor information has been successfully saved in MedVisionRx."}
          </p>

          <div
            className={`success-status ${screeningResult.status}`}
          >
            {screeningResult.status === "clear" && (
              <>
                <CheckCircle2 size={19} />
                No immediate deferral found
              </>
            )}

            {screeningResult.status === "review" && (
              <>
                <AlertCircle size={19} />
                Medical review required
              </>
            )}

            {screeningResult.status === "deferred" && (
              <>
                <XCircle size={19} />
                Temporarily deferred
              </>
            )}
          </div>

          <p className="success-note">
            Registration does not mean final medical
            eligibility. Final donor selection must be
            confirmed by qualified blood-bank staff.
          </p>

          <button
            type="button"
            className="register-donor-button"
            onClick={startNewRegistration}
          >
            Edit Donor Information
          </button>

        </div>
      </div>
    );
  }

  if (view === "preview") {
    return (
      <div className="blood-registration-page">

        <div className="blood-registration-container">

          <div className="preview-page-header">

            <div>
              <div className="registration-title-row">
                <div className="registration-title-icon">
                  <ClipboardCheck size={25} />
                </div>

                <div>
                  <h1>
                    Review Your Registration
                  </h1>

                  <p>
                    Please verify all information before
                    saving your donor registration.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`preview-top-status ${screeningResult.status}`}
            >
              {screeningResult.status === "clear" && (
                <>
                  <CheckCircle2 size={18} />
                  No immediate deferral found
                </>
              )}

              {screeningResult.status === "review" && (
                <>
                  <AlertCircle size={18} />
                  Medical review required
                </>
              )}

              {screeningResult.status === "deferred" && (
                <>
                  <XCircle size={18} />
                  Temporarily deferred
                </>
              )}
            </div>

          </div>

          {message && (
            <div className="registration-message message-danger">
              <AlertCircle size={19} />
              {message}
            </div>
          )}

          <PreviewCard title="Personal Information">
            <div className="preview-grid">

              <PreviewField
                label="Full Name"
                value={form.full_name}
              />

              <PreviewField
                label="Date of Birth"
                value={form.date_of_birth}
              />

              <PreviewField
                label="Age"
                value={
                  age !== null
                    ? `${age} years`
                    : "-"
                }
              />

              <PreviewField
                label="Gender"
                value={form.gender}
              />

              <PreviewField
                label="Blood Group"
                value={form.blood_group}
              />

              <PreviewField
                label="Weight"
                value={`${form.weight_kg} kg`}
              />

            </div>
          </PreviewCard>

          <PreviewCard title="Contact & Address">
            <div className="preview-grid">

              <PreviewField
                label="Mobile Number"
                value={form.phone}
              />

              <PreviewField
                label="Email"
                value={form.email || "Not provided"}
              />

              <PreviewField
                label="City"
                value={form.city || "Not provided"}
              />

              <PreviewField
                label="State"
                value={form.state || "Not provided"}
              />

              <PreviewField
                label="PIN Code"
                value={form.pincode || "Not provided"}
              />

              <PreviewField
                label="Address"
                value={form.address || "Not provided"}
                wide
              />

            </div>
          </PreviewCard>

          <PreviewCard title="Donation History">
            <div className="preview-grid">

              <PreviewField
                label="Previous Donations"
                value={form.previous_donations}
              />

              <PreviewField
                label="Last Donation"
                value={
                  form.last_donation_date ||
                  "No previous donation"
                }
              />

              <PreviewField
                label="Available for Requests"
                value={
                  form.availability
                    ? "Yes"
                    : "No"
                }
              />

            </div>
          </PreviewCard>

          <PreviewCard title="Health Pre-Screening">
            <div className="preview-question-grid">

              <PreviewAnswer
                label="Current fever"
                value={screening.current_fever}
              />

              <PreviewAnswer
                label="Cold / cough / sore throat"
                value={
                  screening.current_cold_cough_sore_throat
                }
              />

              <PreviewAnswer
                label="Acute respiratory problem"
                value={
                  screening.current_acute_respiratory_problem
                }
              />

              <PreviewAnswer
                label="Currently feel unwell"
                value={
                  screening.currently_feel_unwell
                }
              />

              <PreviewAnswer
                label="Alcohol in last 24 hours"
                value={
                  screening.alcohol_last_24_hours
                }
              />

              <PreviewAnswer
                label="Currently under alcohol influence"
                value={
                  screening.currently_under_alcohol_influence
                }
              />

              <PreviewAnswer
                label="Regular heavy alcohol use"
                value={
                  screening.regular_heavy_alcohol_use
                }
              />

              <PreviewAnswer
                label="Medication currently"
                value={
                  screening.taking_medication_now
                }
              />

              <PreviewAnswer
                label="Medicine in last 7 days"
                value={
                  screening.medicine_last_7_days
                }
              />

              <PreviewAnswer
                label="Antibiotics in last 7 days"
                value={
                  screening.antibiotic_last_7_days
                }
              />

              <PreviewAnswer
                label="Blood transfusion"
                value={
                  screening.blood_transfusion_last_12_months
                }
              />

              <PreviewAnswer
                label="Surgery"
                value={
                  screening.surgery_last_12_months
                }
              />

              <PreviewAnswer
                label="Tattoo / piercing / acupuncture"
                value={
                  screening.tattoo_piercing_acupuncture_last_12_months
                }
              />

              <PreviewAnswer
                label="Animal bite"
                value={
                  screening.animal_bite_last_12_months
                }
              />

              <PreviewAnswer
                label="Jaundice"
                value={
                  screening.jaundice_last_12_months
                }
              />

              <PreviewAnswer
                label="Hepatitis B/C positive"
                value={
                  screening.hepatitis_b_c_positive
                }
              />

              <PreviewAnswer
                label="TB / typhoid"
                value={
                  screening.tb_or_typhoid_last_12_months
                }
              />

              <PreviewAnswer
                label="Malaria / antimalarial"
                value={
                  screening.malaria_or_antimalarial_last_3_years
                }
              />

              <PreviewAnswer
                label="Dental procedure"
                value={
                  screening.dental_procedure_last_6_months
                }
              />

              <PreviewAnswer
                label="Measles"
                value={
                  screening.measles_last_6_months
                }
              />

              <PreviewAnswer
                label="Chickenpox"
                value={
                  screening.chickenpox_last_6_months
                }
              />

              <PreviewAnswer
                label="Dengue"
                value={
                  screening.dengue_last_6_months
                }
              />

              <PreviewAnswer
                label="Known HIV positive"
                value={
                  screening.known_hiv_positive
                }
              />

              <PreviewAnswer
                label="Known blood-borne infection"
                value={
                  screening.known_blood_borne_infection
                }
              />

              <PreviewAnswer
                label="Non-prescribed injectable drug use"
                value={
                  screening.non_prescribed_injectable_drug_use
                }
              />

            </div>

            <div className="preview-measurements">

              <h3>Health Measurements</h3>

              <div className="preview-grid">

                <PreviewField
                  label="Temperature"
                  value={
                    screening.temperature_c
                      ? `${screening.temperature_c} °C`
                      : "Not entered"
                  }
                />

                <PreviewField
                  label="Pulse"
                  value={
                    screening.pulse_bpm
                      ? `${screening.pulse_bpm} bpm`
                      : "Not entered"
                  }
                />

                <PreviewField
                  label="Blood Pressure"
                  value={
                    screening.systolic_bp &&
                    screening.diastolic_bp
                      ? `${screening.systolic_bp}/${screening.diastolic_bp} mmHg`
                      : "Not entered"
                  }
                />

                <PreviewField
                  label="Hemoglobin"
                  value={
                    screening.hemoglobin
                      ? `${screening.hemoglobin} g/dL`
                      : "Not entered"
                  }
                />

              </div>

            </div>
          </PreviewCard>

          <div
            className={`preview-result ${screeningResult.status}`}
          >

            {screeningResult.status === "clear" && (
              <>
                <CheckCircle2 size={27} />

                <div>
                  <h3>
                    No immediate deferral found
                  </h3>

                  <p>
                    Your answers do not identify an
                    immediate deferral in this
                    preliminary screening.
                  </p>
                </div>
              </>
            )}

            {screeningResult.status === "review" && (
              <>
                <AlertCircle size={27} />

                <div>
                  <h3>
                    Medical review required
                  </h3>

                  <p>
                    Some answers require assessment
                    by qualified blood-bank staff.
                  </p>
                </div>
              </>
            )}

            {screeningResult.status === "deferred" && (
              <>
                <XCircle size={27} />

                <div>
                  <h3>
                    Temporarily deferred
                  </h3>

                  <p>
                    Please do not proceed with donation
                    until the applicable reason is
                    resolved and the blood centre
                    confirms eligibility.
                  </p>
                </div>
              </>
            )}

          </div>

          {screeningResult.reasons.length > 0 && (
            <div className="preview-reasons deferred-reasons">

              <h3>
                Deferral Reason(s)
              </h3>

              <ul>
                {screeningResult.reasons.map(
                  (reason) => (
                    <li key={reason}>
                      {reason}
                    </li>
                  )
                )}
              </ul>

            </div>
          )}

          {screeningResult.reviewReasons.length > 0 && (
            <div className="preview-reasons review-reasons">

              <h3>
                Medical Review Reason(s)
              </h3>

              <ul>
                {screeningResult.reviewReasons.map(
                  (reason) => (
                    <li key={reason}>
                      {reason}
                    </li>
                  )
                )}
              </ul>

            </div>
          )}

          <div className="preview-actions">

            <button
              type="button"
              className="preview-back-button"
              onClick={() => {
                setView("form");
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              Back & Edit
            </button>

            <button
              type="button"
              className="confirm-save-button"
              onClick={handleSave}
              disabled={saving}
            >
              <ShieldCheck size={19} />

              {saving
                ? "Saving..."
                : "Confirm & Save"}
            </button>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="blood-registration-page">

      <div className="blood-registration-container">

        {/* PAGE HEADER */}

        <div className="blood-registration-header">

          <div className="registration-title-row">

            <div className="registration-title-icon">
              <Droplets size={25} />
            </div>

            <div>
              <h1>
                Register as a Blood Donor
              </h1>

              <p>
                Complete your donor details and
                confidential health pre-screening.
              </p>
            </div>

          </div>

          <div className="registration-security">
            <ShieldCheck size={17} />
            Confidential information
          </div>

        </div>

        {message && (
          <div className="registration-message message-danger">
            <AlertCircle size={19} />
            <span>{message}</span>
          </div>
        )}

        <div className="blood-registration-form">

          {/* PERSONAL INFORMATION */}

          <section className="registration-section">

            <div className="registration-section-header">
              <span>
                <UserRound size={19} />
                Personal Information
              </span>
            </div>

            <div className="registration-section-body">

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Full Name *
                  </label>

                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleFormChange}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Date of Birth *
                  </label>

                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleFormChange}
                  />

                  {age !== null && (
                    <small>
                      Age: {age} years
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label>
                    Gender *
                  </label>

                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleFormChange}
                  >
                    <option value="">
                      Select gender
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    Blood Group *
                  </label>

                  <select
                    name="blood_group"
                    value={form.blood_group}
                    onChange={handleFormChange}
                  >
                    <option value="">
                      Select blood group
                    </option>

                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    Weight (kg) *
                  </label>

                  <input
                    type="number"
                    name="weight_kg"
                    value={form.weight_kg}
                    onChange={handleFormChange}
                    placeholder="e.g. 65"
                    min="1"
                    step="0.1"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Previous Donations
                  </label>

                  <input
                    type="number"
                    name="previous_donations"
                    value={
                      form.previous_donations
                    }
                    onChange={handleFormChange}
                    min="0"
                  />
                </div>

              </div>

            </div>

          </section>

          {/* CONTACT */}

          <section className="registration-section">

            <div className="registration-section-header">
              <span>
                <HeartPulse size={19} />
                Contact & Address
              </span>
            </div>

            <div className="registration-section-body">

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Mobile Number *
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                </div>

                <div className="form-field">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="form-field">
                  <label>
                    City
                  </label>

                  <input
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    placeholder="City"
                  />
                </div>

                <div className="form-field">
                  <label>
                    State
                  </label>

                  <input
                    name="state"
                    value={form.state}
                    onChange={handleFormChange}
                    placeholder="State"
                  />
                </div>

                <div className="form-field">
                  <label>
                    PIN Code
                  </label>

                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleFormChange}
                    placeholder="PIN code"
                    maxLength={6}
                  />
                </div>

                <div className="form-field form-field-wide">
                  <label>
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="Enter your complete address"
                    rows={3}
                  />
                </div>

              </div>

            </div>

          </section>

          {/* DONATION HISTORY */}

          <section className="registration-section">

            <div className="registration-section-header">
              <span>
                <Droplets size={19} />
                Donation History
              </span>
            </div>

            <div className="registration-section-body">

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Last Blood Donation
                  </label>

                  <input
                    type="date"
                    name="last_donation_date"
                    value={
                      form.last_donation_date
                    }
                    onChange={handleFormChange}
                  />

                  <small>
                    Enter the date of your most
                    recent whole-blood donation.
                  </small>
                </div>

              </div>

            </div>

          </section>

          {/* HEALTH SCREENING */}

          <section className="registration-section screening-section">

            <div className="registration-section-header screening-header">
              <span>
                <ClipboardCheck size={19} />
                Donor Health Pre-Screening
              </span>
            </div>

            <div className="registration-section-body">

              <div className="screening-intro">
                <AlertCircle size={20} />

                <div>
                  <strong>
                    Please answer every question honestly.
                  </strong>

                  <p>
                    This is a preliminary safety
                    questionnaire. It does not replace
                    examination by qualified blood-bank
                    staff.
                  </p>
                </div>
              </div>

              <h3>
                Current Health
              </h3>

              <div className="screening-grid">

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="current_fever"
                  label="Do you currently have fever?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="current_cold_cough_sore_throat"
                  label="Do you currently have cold, cough or sore throat?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="current_acute_respiratory_problem"
                  label="Do you currently have an acute respiratory problem?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="currently_feel_unwell"
                  label="Do you currently feel unwell?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="skin_disease_at_donation_site"
                  label="Do you have a skin problem at the donation site?"
                />

              </div>

              <h3>
                Health Measurements
              </h3>

              <p className="screening-help">
                If you do not know these values, leave them
                blank. Blood-bank staff should measure them
                before donation.
              </p>

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Temperature °C
                  </label>

                  <input
                    type="number"
                    step="0.1"
                    name="temperature_c"
                    value={
                      screening.temperature_c
                    }
                    onChange={
                      handleScreeningChange
                    }
                    placeholder="e.g. 36.7"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Pulse / minute
                  </label>

                  <input
                    type="number"
                    name="pulse_bpm"
                    value={
                      screening.pulse_bpm
                    }
                    onChange={
                      handleScreeningChange
                    }
                    placeholder="e.g. 72"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Systolic BP
                  </label>

                  <input
                    type="number"
                    name="systolic_bp"
                    value={
                      screening.systolic_bp
                    }
                    onChange={
                      handleScreeningChange
                    }
                    placeholder="e.g. 120"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Diastolic BP
                  </label>

                  <input
                    type="number"
                    name="diastolic_bp"
                    value={
                      screening.diastolic_bp
                    }
                    onChange={
                      handleScreeningChange
                    }
                    placeholder="e.g. 80"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Hemoglobin g/dL
                  </label>

                  <input
                    type="number"
                    step="0.1"
                    name="hemoglobin"
                    value={
                      screening.hemoglobin
                    }
                    onChange={
                      handleScreeningChange
                    }
                    placeholder="e.g. 13.5"
                  />
                </div>

              </div>

              <h3>
                Alcohol & Medication
              </h3>

              <div className="screening-grid">

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="alcohol_last_24_hours"
                  label="Have you consumed alcohol in the last 24 hours?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="currently_under_alcohol_influence"
                  label="Are you currently under the influence of alcohol?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="regular_heavy_alcohol_use"
                  label="Do you have regular heavy alcohol use?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="taking_medication_now"
                  label="Are you currently taking any medication?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="medicine_last_7_days"
                  label="Have you taken any medicine in the last 7 days?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="antibiotic_last_7_days"
                  label="Have you taken antibiotics in the last 7 days?"
                />

              </div>

              {(screening.taking_medication_now ||
                screening.medicine_last_7_days ||
                screening.antibiotic_last_7_days) && (
                <div className="form-field screening-extra-field">

                  <label>
                    Medicine / Antibiotic Details
                  </label>

                  <textarea
                    name="medication_details"
                    value={
                      screening.medication_details
                    }
                    onChange={
                      handleScreeningChange
                    }
                    placeholder="Medicine name and reason, if known"
                    rows={3}
                  />

                </div>
              )}

              <h3>
                Medical Conditions
              </h3>

              <div className="screening-grid">

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="allergy"
                  label="Allergy"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="kidney_disease"
                  label="Kidney disease"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="endocrine_disease"
                  label="Endocrine disease"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="cancer"
                  label="Cancer"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="mental_illness"
                  label="Mental illness"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="diabetes"
                  label="Diabetes"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="epilepsy"
                  label="Epilepsy"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="fainting_attacks"
                  label="Fainting attacks"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="amoebiasis"
                  label="Amoebiasis"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="syphilis"
                  label="Syphilis"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="bleeding_disorder"
                  label="Blood / bleeding disorder"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="heart_disease"
                  label="Heart disease"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="lung_disease"
                  label="Lung disease"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="asthma"
                  label="Asthma"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="liver_disease"
                  label="Liver disease"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="tuberculosis"
                  label="Tuberculosis"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="polycythemia"
                  label="Polycythemia"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="abnormal_bp"
                  label="High / low blood pressure"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="g6pd_deficiency"
                  label="G6PD deficiency"
                />

              </div>

              <h3>
                Recent Medical History
              </h3>

              <div className="screening-grid">

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="blood_transfusion_last_12_months"
                  label="Blood transfusion in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="surgery_last_12_months"
                  label="Surgery / operation in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="accident_last_12_months"
                  label="Significant accident in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="vaccination_last_12_months"
                  label="Vaccination in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="rabies_vaccination_last_12_months"
                  label="Rabies vaccination in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="animal_bite_last_12_months"
                  label="Animal bite in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="tattoo_piercing_acupuncture_last_12_months"
                  label="Tattoo, piercing or acupuncture in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="jaundice_last_12_months"
                  label="Jaundice in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="hepatitis_b_c_positive"
                  label="Ever tested positive for Hepatitis B or C?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="hepatitis_contact_last_12_months"
                  label="Close contact with jaundice in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="tb_or_typhoid_last_12_months"
                  label="Tuberculosis or typhoid in the last 12 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="malaria_or_antimalarial_last_3_years"
                  label="Malaria / antimalarial treatment in last 3 years?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="dental_procedure_last_6_months"
                  label="Dental procedure in the last 6 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="measles_last_6_months"
                  label="Measles in the last 6 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="chickenpox_last_6_months"
                  label="Chickenpox in the last 6 months?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="dengue_last_6_months"
                  label="Dengue in the last 6 months?"
                />

              </div>

              <h3>
                Confidential Safety Questions
              </h3>

              <div className="screening-grid">

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="known_hiv_positive"
                  label="Have you ever been diagnosed as HIV positive?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="known_blood_borne_infection"
                  label="Do you have a known blood-borne infection?"
                />

                <YesNoQuestion screening={screening} onChange={setScreeningBoolean}
                  name="non_prescribed_injectable_drug_use"
                  label="Non-prescribed injectable drug use?"
                />

              </div>

              <div className="form-field screening-extra-field">

                <label>
                  Additional confidential medical information
                </label>

                <textarea
                  name="confidential_medical_information"
                  value={
                    screening.confidential_medical_information
                  }
                  onChange={
                    handleScreeningChange
                  }
                  placeholder="Anything the blood-bank doctor should know"
                  rows={4}
                />

              </div>

              {/* LIVE RESULT */}

              <div
                className={`live-screening-result ${screeningResult.status}`}
              >

                {screeningResult.status ===
                  "clear" && (
                  <>
                    <CheckCircle2 size={26} />

                    <div>
                      <strong>
                        No immediate deferral found
                      </strong>

                      <p>
                        No immediate deferral was
                        identified from the answers
                        currently entered.
                      </p>
                    </div>
                  </>
                )}

                {screeningResult.status ===
                  "review" && (
                  <>
                    <AlertCircle size={26} />

                    <div>
                      <strong>
                        Medical review required
                      </strong>

                      <p>
                        Some information requires
                        assessment by qualified
                        blood-bank staff.
                      </p>
                    </div>
                  </>
                )}

                {screeningResult.status ===
                  "deferred" && (
                  <>
                    <XCircle size={26} />

                    <div>
                      <strong>
                        Temporarily deferred
                      </strong>

                      <p>
                        One or more answers indicate
                        that donation should not proceed
                        until the applicable issue is
                        resolved and the blood centre
                        confirms eligibility.
                      </p>
                    </div>
                  </>
                )}

              </div>

            </div>

          </section>

          {/* EMERGENCY */}

          <section className="registration-section">

            <div className="registration-section-header">
              <span>
                <HeartPulse size={19} />
                Emergency Contact
              </span>
            </div>

            <div className="registration-section-body">

              <div className="form-grid">

                <div className="form-field">
                  <label>
                    Emergency Contact Name
                  </label>

                  <input
                    name="emergency_contact_name"
                    value={
                      form.emergency_contact_name
                    }
                    onChange={handleFormChange}
                    placeholder="Contact person"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Emergency Contact Phone
                  </label>

                  <input
                    name="emergency_contact_phone"
                    value={
                      form.emergency_contact_phone
                    }
                    onChange={handleFormChange}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>

              </div>

            </div>

          </section>

          {/* CONSENT */}

          <section className="registration-section final-section">

            <label className="availability-check">

              <input
                type="checkbox"
                name="availability"
                checked={form.availability}
                onChange={handleFormChange}
              />

              <span>
                I am willing to be contacted for
                blood donation requests.
              </span>

            </label>

            <label className="consent-check">

              <input
                type="checkbox"
                name="consent"
                checked={form.consent}
                onChange={handleFormChange}
              />

              <span>
                I confirm that the information provided
                is accurate to the best of my knowledge.
                I understand that this questionnaire is
                only a preliminary screening and that
                final eligibility is decided by qualified
                blood-bank staff. *
              </span>

            </label>

            <div className="registration-actions">

              <button
                type="button"
                className="register-donor-button"
                onClick={handlePreview}
              >
                <ClipboardCheck size={19} />
                Preview Registration
              </button>

            </div>

          </section>

        </div>

        <div className="registration-footer-note">
          <ShieldCheck size={17} />

          <span>
            MedVisionRx performs preliminary questionnaire
            screening only. Final donor selection requires
            blood-centre examination and appropriate
            laboratory testing.
          </span>
        </div>

      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */



function PreviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="preview-card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function PreviewField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide ? "preview-field preview-wide" : "preview-field"
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PreviewAnswer({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="preview-answer">
      <span>{label}</span>

      <strong
        className={
          value
            ? "answer-yes"
            : "answer-no"
        }
      >
        {value ? "Yes" : "No"}
      </strong>
    </div>
  );
}

export default BloodDonorRegistration;
function YesNoQuestion({name, label, description, screening, onChange}: {
  name: keyof HealthScreening; label: string; description?: string; screening: HealthScreening;
  onChange: (name: keyof HealthScreening, value: boolean) => void;
}) {
  const value = screening[name] === true;
  return <div className="screening-question"><div className="screening-question-text"><strong>{label}</strong>{description && <small>{description}</small>}</div><div className="yes-no-control">
    <button type="button" className={!value ? "yes-no-option selected-no" : "yes-no-option"} aria-pressed={!value} onClick={() => onChange(name, false)}>No</button>
    <button type="button" className={value ? "yes-no-option selected-yes" : "yes-no-option"} aria-pressed={value} onClick={() => onChange(name, true)}>Yes</button>
  </div></div>;
}
