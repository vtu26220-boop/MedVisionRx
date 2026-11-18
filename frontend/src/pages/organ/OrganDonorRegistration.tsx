type OrganDonorRecord = Partial<Record<"full_name" | "date_of_birth" | "gender" | "blood_group" | "phone" | "email" | "address" | "city" | "state" | "pincode" | "emergency_name" | "emergency_relationship" | "emergency_phone" | "donation_type" | "chronic_disease_details" | "infectious_disease_details" | "medication_details" | "eligibility_status" | "id" | "_id", string>> & {
  organs?: string[]; eligibility_reasons?: string[]; has_chronic_disease?: boolean; has_infectious_disease?: boolean;
  currently_taking_medication?: boolean; consent?: boolean; information_correct?: boolean;
};
type OrganDonorPayload = OrganDonorRecord & { detail?: unknown; message?: string; data?: OrganDonorRecord | OrganDonorRecord[]; donor?: OrganDonorRecord; record?: OrganDonorRecord };
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";

import "./OrganDonorRegistration.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

interface FormData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  phone: string;
  email: string;

  address: string;
  city: string;
  state: string;
  pincode: string;

  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;

  donationType: string;
  organs: string[];

  hasChronicDisease: string;
  chronicDiseaseDetails: string;

  hasInfectiousDisease: string;
  infectiousDiseaseDetails: string;

  currentlyTakingMedication: string;
  medicationDetails: string;

  consent: boolean;
  informationCorrect: boolean;
}

type EligibilityStatus =
  | "not_checked"
  | "eligible"
  | "not_eligible"
  | "medical_review";

interface EligibilityResult {
  status: EligibilityStatus;
  title: string;
  message: string;
  reasons: string[];
}

const organOptions = [
  "Kidneys",
  "Liver",
  "Heart",
  "Lungs",
  "Pancreas",
  "Intestine",
  "Corneas",
  "Skin",
  "Bone",
  "Heart Valves",
];

const livingDonationOrgans = [
  "Kidneys",
  "Liver",
  "Pancreas",
];

const initialFormData: FormData = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  phone: "",
  email: "",

  address: "",
  city: "",
  state: "",
  pincode: "",

  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",

  donationType: "",
  organs: [],

  hasChronicDisease: "",
  chronicDiseaseDetails: "",

  hasInfectiousDisease: "",
  infectiousDiseaseDetails: "",

  currentlyTakingMedication: "",
  medicationDetails: "",

  consent: false,
  informationCorrect: false,
};

function OrganDonorRegistration() {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState<FormData>(initialFormData);

  const [eligibility, setEligibility] =
    useState<EligibilityResult>({
      status: "not_checked",
      title: "",
      message: "",
      reasons: [],
    });

  const [showPreview, setShowPreview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExistingDonor, setIsExistingDonor] = useState(false);
  const [wasExistingDonorAtSubmit, setWasExistingDonorAtSubmit] = useState(false);
  const [isLoadingExistingDonor, setIsLoadingExistingDonor] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      setIsLoadingExistingDonor(true);
      setError("");

      if (!user) {
        if (active) {
          setIsExistingDonor(false);
          setIsLoadingExistingDonor(false);
          setError("Please sign in to register an organ donation pledge.");
        }
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(
          `${API_BASE_URL}/api/organ-donations/by-user/${encodeURIComponent(
            user.uid
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 404) {
          if (active) {
            setIsExistingDonor(false);
            setFormData((current) => ({
              ...current,
              fullName: current.fullName || user.displayName || "",
              email: current.email || user.email || "",
            }));
          }
          return;
        }

        const responseData: OrganDonorPayload | null = await response.json().catch(() => null);

        if (!response.ok) {
          const detail =
            responseData?.detail ||
            `Unable to load your existing organ donor profile (${response.status}).`;
          throw new Error(
            typeof detail === "string"
              ? detail
              : "Unable to load your existing organ donor profile."
          );
        }

        const donor =
          Array.isArray(responseData)
            ? responseData[0]
            : responseData?.data && !Array.isArray(responseData.data)
              ? responseData.data
              : Array.isArray(responseData?.data)
                ? responseData.data[0]
                : responseData?.donor ||
                  responseData?.record ||
                  responseData;

        if (!donor || !active) return;

        const chronicDisease =
          donor.has_chronic_disease === true
            ? "yes"
            : donor.has_chronic_disease === false
              ? "no"
              : "";

        const infectiousDisease =
          donor.has_infectious_disease === true
            ? "yes"
            : donor.has_infectious_disease === false
              ? "no"
              : "";

        const medication =
          donor.currently_taking_medication === true
            ? "yes"
            : donor.currently_taking_medication === false
              ? "no"
              : "";

        setFormData({
          fullName: donor.full_name || user.displayName || "",
          dateOfBirth: donor.date_of_birth || "",
          gender: donor.gender || "",
          bloodGroup: donor.blood_group || "",
          phone: donor.phone || "",
          email: donor.email || user.email || "",

          address: donor.address || "",
          city: donor.city || "",
          state: donor.state || "",
          pincode: donor.pincode || "",

          emergencyName: donor.emergency_name || "",
          emergencyRelationship: donor.emergency_relationship || "",
          emergencyPhone: donor.emergency_phone || "",

          donationType: donor.donation_type || "",
          organs: Array.isArray(donor.organs) ? donor.organs : [],

          hasChronicDisease: chronicDisease,
          chronicDiseaseDetails: donor.chronic_disease_details || "",

          hasInfectiousDisease: infectiousDisease,
          infectiousDiseaseDetails: donor.infectious_disease_details || "",

          currentlyTakingMedication: medication,
          medicationDetails: donor.medication_details || "",

          consent: donor.consent === true,
          informationCorrect: donor.information_correct === true,
        });

        const savedEligibilityStatus =
          donor.eligibility_status as EligibilityStatus | undefined;

        setEligibility({
          status:
            savedEligibilityStatus === "eligible" ||
            savedEligibilityStatus === "not_eligible" ||
            savedEligibilityStatus === "medical_review"
              ? savedEligibilityStatus
              : "not_checked",
          title:
            savedEligibilityStatus === "eligible"
              ? "No Immediate Eligibility Concern Found"
              : savedEligibilityStatus === "medical_review"
                ? "Medical Review Required"
                : savedEligibilityStatus === "not_eligible"
                  ? "Not Eligible"
                  : "",
          message:
            savedEligibilityStatus === "eligible"
              ? "Based on the saved information, no immediate screening issue was identified. Final eligibility and suitability are determined by the appropriate medical authorities."
              : savedEligibilityStatus === "medical_review"
                ? "The saved donor profile requires medical review."
                : savedEligibilityStatus === "not_eligible"
                  ? "The saved donor profile did not pass the eligibility screening."
                  : "",
          reasons: Array.isArray(donor.eligibility_reasons)
            ? donor.eligibility_reasons
            : [],
        });

        const donorId = donor.id || donor._id;
        if (donorId) {
          localStorage.setItem("medvisionrx_organ_donor_id", String(donorId));
        }

        setIsExistingDonor(true);
      } catch (loadError) {
        console.error("Unable to load existing organ donor profile:", loadError);
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your existing organ donor profile."
          );
        }
      } finally {
        if (active) setIsLoadingExistingDonor(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "donationType") {
      setEligibility({
        status: "not_checked",
        title: "",
        message: "",
        reasons: [],
      });
    }

    if (error) {
      setError("");
    }
  };

  const handleOrganChange = (organ: string) => {
    setFormData((current) => {
      const exists = current.organs.includes(organ);

      return {
        ...current,
        organs: exists
          ? current.organs.filter((item) => item !== organ)
          : [...current.organs, organ],
      };
    });

    setEligibility({
      status: "not_checked",
      title: "",
      message: "",
      reasons: [],
    });

    if (error) {
      setError("");
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) {
      return null;
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    let age =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const runEligibilityCheck = (): EligibilityResult => {
    const reasons: string[] = [];

    const age = calculateAge(formData.dateOfBirth);

    if (
      formData.donationType === "living" &&
      age !== null &&
      age < 18
    ) {
      return {
        status: "not_eligible",
        title: "You cannot proceed with living donation",
        message:
          "Living organ donors must be at least 18 years old under the applicable Indian legal framework.",
        reasons: [
          "The selected donation type is living organ donation.",
          "The donor is below 18 years of age.",
        ],
      };
    }

    if (
      formData.donationType === "living" &&
      formData.organs.some(
        (organ) => !livingDonationOrgans.includes(organ)
      )
    ) {
      reasons.push(
        "Some selected organs/tissues are not part of the usual living-donation options."
      );
    }

    if (
      formData.hasChronicDisease === "yes"
    ) {
      reasons.push(
        "A chronic disease has been reported and requires medical assessment."
      );
    }

    if (
      formData.hasInfectiousDisease === "yes"
    ) {
      reasons.push(
        "An infectious disease or relevant infection history has been reported and requires medical assessment."
      );
    }

    if (
      formData.currentlyTakingMedication === "yes"
    ) {
      reasons.push(
        "Current medication has been reported and may require medical assessment."
      );
    }

    if (reasons.length > 0) {
      return {
        status: "medical_review",
        title: "Medical Review Required",
        message:
          "Your information does not allow MedVisionRx to confirm medical suitability. A qualified medical professional must assess these details.",
        reasons,
      };
    }

    return {
      status: "eligible",
      title: "No Immediate Eligibility Concern Found",
      message:
        "Based on the information entered, no immediate screening issue was identified. Final eligibility and suitability are determined by the appropriate medical authorities.",
      reasons: [],
    };
  };

  const handleEligibilityCheck = () => {
    if (!formData.dateOfBirth) {
      setError("Please enter your date of birth first.");
      return;
    }

    if (!formData.donationType) {
      setError("Please select the type of organ donation.");
      return;
    }

    if (formData.organs.length === 0) {
      setError(
        "Please select at least one organ or tissue you wish to pledge."
      );
      return;
    }

    const result = runEligibilityCheck();

    setEligibility(result);
    setError("");

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!formData.dateOfBirth) {
      return "Please enter your date of birth.";
    }

    if (!formData.gender) {
      return "Please select your gender.";
    }

    if (!formData.bloodGroup) {
      return "Please select your blood group.";
    }

    if (!formData.phone.trim()) {
      return "Please enter your phone number.";
    }

    if (!formData.email.trim()) {
      return "Please enter your email address.";
    }

    if (!formData.address.trim()) {
      return "Please enter your address.";
    }

    if (!formData.city.trim()) {
      return "Please enter your city.";
    }

    if (!formData.state.trim()) {
      return "Please enter your state.";
    }

    if (!formData.pincode.trim()) {
      return "Please enter your pincode.";
    }

    if (!formData.emergencyName.trim()) {
      return "Please enter your emergency contact name.";
    }

    if (!formData.emergencyRelationship) {
      return "Please select your emergency contact relationship.";
    }

    if (!formData.emergencyPhone.trim()) {
      return "Please enter your emergency contact phone.";
    }

    if (!formData.donationType) {
      return "Please select your donation type.";
    }

    if (formData.organs.length === 0) {
      return "Please select at least one organ/tissue you wish to pledge.";
    }

    if (!formData.hasChronicDisease) {
      return "Please answer the chronic disease question.";
    }

    if (
      formData.hasChronicDisease === "yes" &&
      !formData.chronicDiseaseDetails.trim()
    ) {
      return "Please provide details about your chronic disease.";
    }

    if (!formData.hasInfectiousDisease) {
      return "Please answer the infectious disease question.";
    }

    if (
      formData.hasInfectiousDisease === "yes" &&
      !formData.infectiousDiseaseDetails.trim()
    ) {
      return "Please provide details about your infectious disease.";
    }

    if (!formData.currentlyTakingMedication) {
      return "Please answer the medication question.";
    }

    if (
      formData.currentlyTakingMedication === "yes" &&
      !formData.medicationDetails.trim()
    ) {
      return "Please provide your medication details.";
    }

    if (!formData.consent) {
      return "Please provide consent for the organ donation pledge.";
    }

    if (!formData.informationCorrect) {
      return "Please confirm that the information provided is correct.";
    }

    return "";
  };

  const handlePreview = (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const result = runEligibilityCheck();

    setEligibility(result);

    if (result.status === "not_eligible") {
      setError(
        "You cannot continue because the eligibility screening did not pass."
      );

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });

      return;
    }

    if (result.status === "medical_review") {
      setError(
        "Medical review is required before this pledge can be confirmed."
      );

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });

      return;
    }

    setError("");
    setShowPreview(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleConfirm = async () => {
    if (eligibility.status !== "eligible") {
      setError(
        "This pledge cannot be confirmed until the eligibility screening is passed."
      );
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setShowPreview(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setIsSubmitting(true);
      setWasExistingDonorAtSubmit(isExistingDonor);
      setError("");

      const payload = {
        full_name: formData.fullName.trim(),
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        blood_group: formData.bloodGroup,
        phone: formData.phone.trim(),
        email: formData.email.trim(),

        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),

        emergency_name:
          formData.emergencyName.trim(),
        emergency_relationship:
          formData.emergencyRelationship,
        emergency_phone:
          formData.emergencyPhone.trim(),

        donation_type: formData.donationType,
        organs: formData.organs,

        has_chronic_disease:
          formData.hasChronicDisease === "yes",

        chronic_disease_details:
          formData.hasChronicDisease === "yes"
            ? formData.chronicDiseaseDetails.trim()
            : null,

        has_infectious_disease:
          formData.hasInfectiousDisease === "yes",

        infectious_disease_details:
          formData.hasInfectiousDisease === "yes"
            ? formData.infectiousDiseaseDetails.trim()
            : null,

        currently_taking_medication:
          formData.currentlyTakingMedication === "yes",

        medication_details:
          formData.currentlyTakingMedication === "yes"
            ? formData.medicationDetails.trim()
            : null,

        eligibility_status:
          eligibility.status,

        eligibility_reasons:
          eligibility.reasons,

        consent:
          formData.consent,

        information_correct:
          formData.informationCorrect,
      };

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const userId = firebaseUser.uid;
      const idToken = await firebaseUser.getIdToken();

      const existingDonorId =
        localStorage.getItem("medvisionrx_organ_donor_id") || "";

      /*
       * Existing donor profiles must be updated instead of creating a
       * second donor record. New users still use POST.
       */
      /*
       * The backend POST endpoint already supports the complete
       * register/update flow when user_id is supplied:
       *
       *   POST /api/organ-donations/?user_id=<current-user>
       *
       * The previous frontend code tried:
       *
       *   PUT /api/organ-donations/<donor-id>
       *
       * but the router did not expose a PUT endpoint. That caused
       * HTTP 405 Method Not Allowed and the pledge was never saved.
       *
       * Always use the supported POST + user_id flow here. The backend
       * service decides whether to create a new profile or update the
       * existing profile for that user.
       */
      const registrationUrl = userId
        ? `${API_BASE_URL}/api/organ-donations/?user_id=${encodeURIComponent(
            userId
          )}`
        : `${API_BASE_URL}/api/organ-donations/`;

      const method = "POST";

      const response = await fetch(
        registrationUrl,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      let responseData: OrganDonorPayload | null = null;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        const backendMessage =
          responseData?.detail ||
          responseData?.message ||
          "Unable to save the organ donation pledge.";

        let message =
          "Unable to save the organ donation pledge.";

        if (Array.isArray(backendMessage)) {
          message = backendMessage
            .map((item: { msg?: string }) =>
              item?.msg ? item.msg : ""
            )
            .filter(Boolean)
            .join(", ");
        } else if (
          typeof backendMessage === "string"
        ) {
          message = backendMessage;
        }

        throw new Error(message);
      }

      const savedDonor =
        Array.isArray(responseData)
          ? responseData[0]
          : responseData?.data &&
              !Array.isArray(responseData.data)
            ? responseData.data
            : Array.isArray(responseData?.data)
              ? responseData.data[0]
              : responseData?.donor ||
                responseData?.record ||
                responseData;

      const savedDonorId =
        savedDonor?.id ||
        savedDonor?._id ||
        existingDonorId;

      if (savedDonorId) {
        localStorage.setItem(
          "medvisionrx_organ_donor_id",
          String(savedDonorId)
        );
      }

      /*
       * Keep the complete current donor record locally. This makes the
       * saved-donor page immediately consistent after registration or
       * profile editing.
       */
      if (savedDonor && savedDonorId) {
        try {
          const storedRecords =
            localStorage.getItem(
              "medvisionrx_saved_organ_donor_records"
            );

          const parsedRecords =
            storedRecords
              ? JSON.parse(storedRecords)
              : [];

          const records = Array.isArray(
            parsedRecords
          )
            ? parsedRecords
            : [];

          const normalizedRecord = {
            ...savedDonor,
            id: String(savedDonorId),
          };

          const nextRecords = records.filter(
            (record: { id?: string; _id?: string }) =>
              String(
                record?.id ||
                  record?._id ||
                  ""
              ) !== String(savedDonorId)
          );

          nextRecords.push(
            normalizedRecord
          );

          localStorage.setItem(
            "medvisionrx_saved_organ_donor_records",
            JSON.stringify(nextRecords)
          );
        } catch (storageError) {
          console.warn(
            "Unable to cache donor record locally:",
            storageError
          );
        }
      }

      setIsExistingDonor(true);
      setSubmitted(true);
      setShowPreview(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (submitError) {
      console.error(
        "Organ donation submission failed:",
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save your organ donation pledge. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setShowPreview(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  

  if (submitted) {
    return (
      <div className="organ-registration-page">
        <div className="organ-registration-success">
          <div className="organ-success-icon">
            <CheckCircle2 size={42} />
          </div>

          <h1>
            {wasExistingDonorAtSubmit
              ? "Donor Profile Updated"
              : "Registration Submitted"}
          </h1>

          <p>
            {wasExistingDonorAtSubmit
              ? "Your organ donor profile has been successfully updated in MedVisionRx."
              : "Your organ donation pledge has been successfully recorded in MedVisionRx and is now saved for processing."}
          </p>

          <div className="organ-success-note">
            <ShieldCheck size={19} />

            <span>
              This pledge records your intention to
              donate. Final medical suitability and
              donation procedures are determined by
              the appropriate authorized medical
              authorities.
            </span>
          </div>

          <div className="organ-success-actions">
            <button
              type="button"
              className="organ-primary-button"
              onClick={() =>
                navigate("/organ-donation")
              }
            >
              Go to Dashboard
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="organ-secondary-button"
              onClick={() => {
                setSubmitted(false);
                setShowPreview(false);
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              Edit Donor Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="organ-registration-page">
        <div className="organ-registration-header">
          <div>
            <span className="organ-registration-eyebrow">
              ORGAN DONATION
            </span>

            <h1>
              Preview Your Donation Pledge
            </h1>

            <p>
              Review the information carefully before
              confirming your pledge.
            </p>
          </div>

          <button
            type="button"
            className="organ-back-button"
            onClick={handleEdit}
          >
            <ArrowLeft size={17} />
            Edit Registration
          </button>
        </div>

        <div className="organ-preview-grid">
          <section className="organ-preview-card">
            <div className="organ-preview-card-header">
              <UserRound size={19} />
              <h2>Personal Information</h2>
            </div>

            <div className="organ-preview-fields">
              <PreviewField
                label="Full Name"
                value={formData.fullName}
              />

              <PreviewField
                label="Date of Birth"
                value={formData.dateOfBirth}
              />

              <PreviewField
                label="Gender"
                value={formData.gender}
              />

              <PreviewField
                label="Blood Group"
                value={formData.bloodGroup}
              />

              <PreviewField
                label="Phone"
                value={formData.phone}
              />

              <PreviewField
                label="Email"
                value={formData.email}
              />
            </div>
          </section>

          <section className="organ-preview-card">
            <div className="organ-preview-card-header">
              <ClipboardList size={19} />
              <h2>Address</h2>
            </div>

            <div className="organ-preview-fields">
              <PreviewField
                label="Address"
                value={formData.address}
              />

              <PreviewField
                label="City"
                value={formData.city}
              />

              <PreviewField
                label="State"
                value={formData.state}
              />

              <PreviewField
                label="Pincode"
                value={formData.pincode}
              />
            </div>
          </section>

          <section className="organ-preview-card">
            <div className="organ-preview-card-header">
              <HeartHandshake size={19} />
              <h2>Donation Pledge</h2>
            </div>

            <div className="organ-preview-fields">
              <PreviewField
                label="Donation Type"
                value={
                  formData.donationType === "living"
                    ? "Living Organ Donation"
                    : "Donation After Death"
                }
              />
            </div>

            <div className="organ-selected-list">
              {formData.organs.map((organ) => (
                <span key={organ}>
                  {organ}
                </span>
              ))}
            </div>
          </section>

          <section className="organ-preview-card">
            <div className="organ-preview-card-header">
              <UserRound size={19} />
              <h2>Emergency Contact</h2>
            </div>

            <div className="organ-preview-fields">
              <PreviewField
                label="Name"
                value={formData.emergencyName}
              />

              <PreviewField
                label="Relationship"
                value={
                  formData.emergencyRelationship
                }
              />

              <PreviewField
                label="Phone"
                value={formData.emergencyPhone}
              />
            </div>
          </section>

          <section className="organ-preview-card organ-preview-full">
            <div className="organ-preview-card-header">
              <ShieldCheck size={19} />
              <h2>Medical Information</h2>
            </div>

            <div className="organ-preview-fields">
              <PreviewField
                label="Chronic Disease"
                value={
                  formData.hasChronicDisease === "yes"
                    ? "Yes"
                    : "No"
                }
              />

              {formData.hasChronicDisease ===
                "yes" && (
                <PreviewField
                  label="Chronic Disease Details"
                  value={
                    formData.chronicDiseaseDetails
                  }
                />
              )}

              <PreviewField
                label="Infectious Disease"
                value={
                  formData.hasInfectiousDisease ===
                  "yes"
                    ? "Yes"
                    : "No"
                }
              />

              {formData.hasInfectiousDisease ===
                "yes" && (
                <PreviewField
                  label="Infectious Disease Details"
                  value={
                    formData.infectiousDiseaseDetails
                  }
                />
              )}

              <PreviewField
                label="Currently Taking Medication"
                value={
                  formData.currentlyTakingMedication ===
                  "yes"
                    ? "Yes"
                    : "No"
                }
              />

              {formData.currentlyTakingMedication ===
                "yes" && (
                <PreviewField
                  label="Medication Details"
                  value={
                    formData.medicationDetails
                  }
                />
              )}
            </div>
          </section>
        </div>

        <div className="organ-preview-confirmation">
          <ShieldCheck size={21} />

          <div>
            <strong>
              Eligibility screening passed
            </strong>

            <p>
              No immediate screening issue was
              identified from the information entered.
              Final medical suitability remains the
              responsibility of authorized medical
              professionals.
            </p>
          </div>
        </div>

        <div className="organ-preview-actions">
          <button
            type="button"
            className="organ-secondary-button"
            onClick={handleEdit}
            disabled={isSubmitting}
          >
            <ArrowLeft size={17} />
            Go Back & Edit
          </button>

          <button
            type="button"
            className="organ-primary-button"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving Pledge..."
              : "Confirm & Save Pledge"}

            {!isSubmitting && (
              <CheckCircle2 size={18} />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="organ-registration-page">
      <div className="organ-registration-header">
        <div className="organ-registration-title-wrap">
          <div className="organ-registration-title-icon">
            <HeartHandshake size={27} />
          </div>

          <div className="organ-registration-title-copy">
            <h1>
              {isExistingDonor
                ? "Edit Your Organ Donor Profile"
                : "Register as an Organ Donor"}
            </h1>

            <p>
              {isExistingDonor
                ? "Your existing organ donor registration has been loaded. Review or edit your information and save the changes."
                : "Complete your donor details and confidential health pre-screening."}
            </p>
          </div>
        </div>

        <div className="organ-confidential-badge">
          <ShieldCheck size={17} />
          <span>Confidential information</span>
        </div>
      </div>

      <div className="organ-registration-info">
        <ShieldCheck size={20} />

        <div>
          <strong>
            Important information
          </strong>

          <p>
            This form records your donation intention.
            It does not replace medical assessment or
            legal authorization. Final suitability is
            determined by the appropriate medical
            authorities.
          </p>
        </div>
      </div>

      {isLoadingExistingDonor ? (
        <div className="organ-registration-info">
          <ShieldCheck size={20} />
          <div>
            <strong>Checking existing donor registration</strong>
            <p>
              MedVisionRx is checking whether you already have an
              organ donor profile. Your existing information will be
              loaded automatically when available.
            </p>
          </div>
        </div>
      ) : isExistingDonor ? (
        <div className="organ-registration-info">
          <ShieldCheck size={20} />
          <div>
            <strong>Existing donor profile loaded</strong>
            <p>
              This is your existing organ donor registration.
              You can edit the information and save the updated profile.
            </p>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="organ-registration-error">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <form
        className="organ-registration-form"
        onSubmit={handlePreview}
      >
        {/* PERSONAL INFORMATION */}

        <section className="organ-form-section">
          <div className="organ-form-section-header">
            <div className="organ-section-icon">
              <UserRound size={19} />
            </div>

            <div>
              <h2>
                Personal Information
              </h2>

              <p>
                Enter your basic identification and
                contact details.
              </p>
            </div>
          </div>

          <div className="organ-form-grid">
            <div className="organ-form-group organ-form-full">
              <label htmlFor="fullName">
                Full Name <span>*</span>
              </label>

              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(event) =>
                  handleInputChange(
                    "fullName",
                    event.target.value
                  )
                }
                placeholder="Enter your full name"
              />
            </div>

            <div className="organ-form-group">
              <label htmlFor="dateOfBirth">
                Date of Birth <span>*</span>
              </label>

              <input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(event) =>
                  handleInputChange(
                    "dateOfBirth",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="organ-form-group">
              <label htmlFor="gender">
                Gender <span>*</span>
              </label>

              <select
                id="gender"
                value={formData.gender}
                onChange={(event) =>
                  handleInputChange(
                    "gender",
                    event.target.value
                  )
                }
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

                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>

            <div className="organ-form-group">
              <label htmlFor="bloodGroup">
                Blood Group <span>*</span>
              </label>

              <select
                id="bloodGroup"
                value={formData.bloodGroup}
                onChange={(event) =>
                  handleInputChange(
                    "bloodGroup",
                    event.target.value
                  )
                }
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

            <div className="organ-form-group">
              <label htmlFor="phone">
                Phone Number <span>*</span>
              </label>

              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(event) =>
                  handleInputChange(
                    "phone",
                    event.target.value
                  )
                }
                placeholder="Enter phone number"
              />
            </div>

            <div className="organ-form-group organ-form-full">
              <label htmlFor="email">
                Email Address <span>*</span>
              </label>

              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) =>
                  handleInputChange(
                    "email",
                    event.target.value
                  )
                }
                placeholder="Enter email address"
              />
            </div>
          </div>
        </section>

        {/* ADDRESS */}

        <section className="organ-form-section">
          <div className="organ-form-section-header">
            <div className="organ-section-icon">
              <ClipboardList size={19} />
            </div>

            <div>
              <h2>Address</h2>

              <p>
                Provide your current residential
                address.
              </p>
            </div>
          </div>

          <div className="organ-form-grid">
            <div className="organ-form-group organ-form-full">
              <label htmlFor="address">
                Address <span>*</span>
              </label>

              <textarea
                id="address"
                rows={3}
                value={formData.address}
                onChange={(event) =>
                  handleInputChange(
                    "address",
                    event.target.value
                  )
                }
                placeholder="Enter your complete address"
              />
            </div>

            <div className="organ-form-group">
              <label htmlFor="city">
                City <span>*</span>
              </label>

              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(event) =>
                  handleInputChange(
                    "city",
                    event.target.value
                  )
                }
                placeholder="Enter city"
              />
            </div>

            <div className="organ-form-group">
              <label htmlFor="state">
                State <span>*</span>
              </label>

              <input
                id="state"
                type="text"
                value={formData.state}
                onChange={(event) =>
                  handleInputChange(
                    "state",
                    event.target.value
                  )
                }
                placeholder="Enter state"
              />
            </div>

            <div className="organ-form-group">
              <label htmlFor="pincode">
                Pincode <span>*</span>
              </label>

              <input
                id="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={formData.pincode}
                onChange={(event) =>
                  handleInputChange(
                    "pincode",
                    event.target.value
                  )
                }
                placeholder="Enter pincode"
              />
            </div>
          </div>
        </section>

        {/* EMERGENCY CONTACT */}

        <section className="organ-form-section">
          <div className="organ-form-section-header">
            <div className="organ-section-icon">
              <HeartHandshake size={19} />
            </div>

            <div>
              <h2>
                Emergency Contact
              </h2>

              <p>
                Provide a person who can be contacted
                when required.
              </p>
            </div>
          </div>

          <div className="organ-form-grid">
            <div className="organ-form-group">
              <label htmlFor="emergencyName">
                Contact Name <span>*</span>
              </label>

              <input
                id="emergencyName"
                type="text"
                value={formData.emergencyName}
                onChange={(event) =>
                  handleInputChange(
                    "emergencyName",
                    event.target.value
                  )
                }
                placeholder="Enter contact name"
              />
            </div>

            <div className="organ-form-group">
              <label htmlFor="emergencyRelationship">
                Relationship <span>*</span>
              </label>

              <select
                id="emergencyRelationship"
                value={
                  formData.emergencyRelationship
                }
                onChange={(event) =>
                  handleInputChange(
                    "emergencyRelationship",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select relationship
                </option>

                <option value="Parent">
                  Parent
                </option>

                <option value="Spouse">
                  Spouse
                </option>

                <option value="Sibling">
                  Sibling
                </option>

                <option value="Child">
                  Child
                </option>

                <option value="Relative">
                  Relative
                </option>

                <option value="Friend">
                  Friend
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div className="organ-form-group">
              <label htmlFor="emergencyPhone">
                Contact Phone <span>*</span>
              </label>

              <input
                id="emergencyPhone"
                type="tel"
                value={formData.emergencyPhone}
                onChange={(event) =>
                  handleInputChange(
                    "emergencyPhone",
                    event.target.value
                  )
                }
                placeholder="Enter contact phone"
              />
            </div>
          </div>
        </section>

        {/* DONATION TYPE */}

        <section className="organ-form-section">
          <div className="organ-form-section-header">
            <div className="organ-section-icon">
              <HeartHandshake size={19} />
            </div>

            <div>
              <h2>
                Donation Type
              </h2>

              <p>
                Select how you intend to donate.
              </p>
            </div>
          </div>

          <div className="organ-donation-type-grid">
            <label
              className={`organ-donation-type-card ${
                formData.donationType ===
                "deceased"
                  ? "selected"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="donationType"
                value="deceased"
                checked={
                  formData.donationType ===
                  "deceased"
                }
                onChange={(event) =>
                  handleInputChange(
                    "donationType",
                    event.target.value
                  )
                }
              />

              <div>
                <strong>
                  Donation After Death
                </strong>

                <span>
                  Pledge organs and tissues for
                  donation after death.
                </span>
              </div>
            </label>

            <label
              className={`organ-donation-type-card ${
                formData.donationType ===
                "living"
                  ? "selected"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="donationType"
                value="living"
                checked={
                  formData.donationType ===
                  "living"
                }
                onChange={(event) =>
                  handleInputChange(
                    "donationType",
                    event.target.value
                  )
                }
              />

              <div>
                <strong>
                  Living Donation
                </strong>

                <span>
                  Donation during life, subject to
                  applicable medical and legal
                  requirements.
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* ORGAN PLEDGE */}

        <section className="organ-form-section">
          <div className="organ-form-section-header">
            <div className="organ-section-icon">
              <HeartHandshake size={19} />
            </div>

            <div>
              <h2>
                Organ & Tissue Pledge
              </h2>

              <p>
                Select the organs or tissues you
                wish to pledge.
              </p>
            </div>
          </div>

          <div className="organ-options-grid">
            {organOptions.map((organ) => {
              const selected =
                formData.organs.includes(organ);

              return (
                <label
                  key={organ}
                  className={`organ-option-card ${
                    selected
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      handleOrganChange(organ)
                    }
                  />

                  <span className="organ-option-check">
                    {selected && (
                      <CheckCircle2 size={17} />
                    )}
                  </span>

                  <span className="organ-option-name">
                    {organ}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* MEDICAL INFORMATION */}

        <section className="organ-form-section">
          <div className="organ-form-section-header">
            <div className="organ-section-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2>
                Medical Information
              </h2>

              <p>
                Provide relevant health information
                for screening purposes.
              </p>
            </div>
          </div>

          <div className="organ-medical-question">
            <label>
              Do you have any chronic disease?{" "}
              <span>*</span>
            </label>

            <div className="organ-radio-group">
              <label>
                <input
                  type="radio"
                  name="chronicDisease"
                  value="yes"
                  checked={
                    formData.hasChronicDisease ===
                    "yes"
                  }
                  onChange={(event) =>
                    handleInputChange(
                      "hasChronicDisease",
                      event.target.value
                    )
                  }
                />
                Yes
              </label>

              <label>
                <input
                  type="radio"
                  name="chronicDisease"
                  value="no"
                  checked={
                    formData.hasChronicDisease ===
                    "no"
                  }
                  onChange={(event) =>
                    handleInputChange(
                      "hasChronicDisease",
                      event.target.value
                    )
                  }
                />
                No
              </label>
            </div>

            {formData.hasChronicDisease ===
              "yes" && (
              <textarea
                value={
                  formData.chronicDiseaseDetails
                }
                onChange={(event) =>
                  handleInputChange(
                    "chronicDiseaseDetails",
                    event.target.value
                  )
                }
                placeholder="Please provide details"
                rows={3}
              />
            )}
          </div>

          <div className="organ-medical-question">
            <label>
              Do you have any infectious disease
              or relevant infection history?{" "}
              <span>*</span>
            </label>

            <div className="organ-radio-group">
              <label>
                <input
                  type="radio"
                  name="infectiousDisease"
                  value="yes"
                  checked={
                    formData.hasInfectiousDisease ===
                    "yes"
                  }
                  onChange={(event) =>
                    handleInputChange(
                      "hasInfectiousDisease",
                      event.target.value
                    )
                  }
                />
                Yes
              </label>

              <label>
                <input
                  type="radio"
                  name="infectiousDisease"
                  value="no"
                  checked={
                    formData.hasInfectiousDisease ===
                    "no"
                  }
                  onChange={(event) =>
                    handleInputChange(
                      "hasInfectiousDisease",
                      event.target.value
                    )
                  }
                />
                No
              </label>
            </div>

            {formData.hasInfectiousDisease ===
              "yes" && (
              <textarea
                value={
                  formData.infectiousDiseaseDetails
                }
                onChange={(event) =>
                  handleInputChange(
                    "infectiousDiseaseDetails",
                    event.target.value
                  )
                }
                placeholder="Please provide details"
                rows={3}
              />
            )}
          </div>

          <div className="organ-medical-question">
            <label>
              Are you currently taking any
              medication? <span>*</span>
            </label>

            <div className="organ-radio-group">
              <label>
                <input
                  type="radio"
                  name="medication"
                  value="yes"
                  checked={
                    formData.currentlyTakingMedication ===
                    "yes"
                  }
                  onChange={(event) =>
                    handleInputChange(
                      "currentlyTakingMedication",
                      event.target.value
                    )
                  }
                />
                Yes
              </label>

              <label>
                <input
                  type="radio"
                  name="medication"
                  value="no"
                  checked={
                    formData.currentlyTakingMedication ===
                    "no"
                  }
                  onChange={(event) =>
                    handleInputChange(
                      "currentlyTakingMedication",
                      event.target.value
                    )
                  }
                />
                No
              </label>
            </div>

            {formData.currentlyTakingMedication ===
              "yes" && (
              <textarea
                value={
                  formData.medicationDetails
                }
                onChange={(event) =>
                  handleInputChange(
                    "medicationDetails",
                    event.target.value
                  )
                }
                placeholder="List your current medications"
                rows={3}
              />
            )}
          </div>
        </section>

        {/* ELIGIBILITY CHECK */}

        <section className="organ-eligibility-section">
          <div className="organ-eligibility-header">
            <div className="organ-section-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2>
                Eligibility Screening
              </h2>

              <p>
                Check your information before
                continuing to registration preview.
              </p>
            </div>
          </div>

          <div className="organ-eligibility-action">
            <button
              type="button"
              className="organ-primary-button"
              onClick={handleEligibilityCheck}
            >
              Check Eligibility
              <ShieldCheck size={18} />
            </button>
          </div>

          {eligibility.status !==
            "not_checked" && (
            <div
              className={`organ-eligibility-result ${eligibility.status}`}
            >
              <div className="organ-eligibility-result-icon">
                {eligibility.status ===
                "eligible" ? (
                  <CheckCircle2 size={25} />
                ) : eligibility.status ===
                  "not_eligible" ? (
                  <XCircle size={25} />
                ) : (
                  <AlertCircle size={25} />
                )}
              </div>

              <div className="organ-eligibility-result-content">
                <h3>
                  {eligibility.title}
                </h3>

                <p>
                  {eligibility.message}
                </p>

                {eligibility.reasons.length >
                  0 && (
                  <ul>
                    {eligibility.reasons.map(
                      (reason) => (
                        <li key={reason}>
                          {reason}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* CONSENT */}

        <section className="organ-form-section">
          <div className="organ-form-section-header">
            <div className="organ-section-icon">
              <CheckCircle2 size={19} />
            </div>

            <div>
              <h2>
                Consent & Confirmation
              </h2>

              <p>
                Confirm your intention before
                submitting the registration.
              </p>
            </div>
          </div>

          <div className="organ-consent-box">
            <label className="organ-consent-item">
              <input
                type="checkbox"
                checked={formData.consent}
                onChange={(event) =>
                  handleInputChange(
                    "consent",
                    event.target.checked
                  )
                }
              />

              <span>
                I voluntarily express my intention
                to pledge the selected organs/tissues
                for donation and understand that the
                actual donation process is subject to
                applicable medical and legal
                requirements.
              </span>
            </label>

            <label className="organ-consent-item">
              <input
                type="checkbox"
                checked={
                  formData.informationCorrect
                }
                onChange={(event) =>
                  handleInputChange(
                    "informationCorrect",
                    event.target.checked
                  )
                }
              />

              <span>
                I confirm that the information
                provided in this form is accurate to
                the best of my knowledge.
              </span>
            </label>
          </div>
        </section>

        <div className="organ-form-submit-area">
          <p>
            <span>*</span> Required fields
          </p>

          <button
            type="submit"
            className="organ-primary-button organ-preview-button"
            disabled={
              isLoadingExistingDonor ||
              eligibility.status !== "eligible"
            }
          >
            Preview Registration
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

interface PreviewFieldProps {
  label: string;
  value: string;
}

function PreviewField({
  label,
  value,
}: PreviewFieldProps) {
  return (
    <div className="organ-preview-field">
      <span>{label}</span>

      <strong>
        {value || "—"}
      </strong>
    </div>
  );
}

export default OrganDonorRegistration;