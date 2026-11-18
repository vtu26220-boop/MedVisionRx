import RequireLogin from "../components/common/RequireLogin";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminPortal from "../pages/admin/AdminPortal";

// =========================================================
// PUBLIC PAGES
// =========================================================

import LandingEntry from "../pages/public/LandingEntry";
import About from "../pages/public/About";
import Services from "../pages/public/Services";
import Contact from "../pages/public/Contact";
import Legal from "../pages/public/Legal";

// =========================================================
// AUTH PAGES
// =========================================================

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// =========================================================
// BLOOD DONATION
// =========================================================

import BloodDonationLayout from "../pages/blood/BloodDonationLayout";
import BloodDonationDashboard from "../pages/blood/BloodDonationDashboard";
import BloodDonorRegistration from "../pages/blood/BloodDonorRegistration";
import BloodDonationHistory from "../pages/blood/BloodDonationHistory";
import BloodEligibility from "../pages/blood/BloodEligibility";
import BloodGuidelines from "../pages/blood/BloodGuidelines";
import BloodRequests from "../pages/blood/BloodRequests";
import BloodBanks from "../pages/blood/BloodBanks";
import BloodDonationAbout from "../pages/blood/About";
import BloodDonationContact from "../pages/blood/Contact";

// =========================================================
// BLOOD REQUIREMENT
// =========================================================

import BloodRequirementLayout from "../pages/blood-requirement/BloodRequirementLayout";
import BloodRequirementDashboard from "../pages/blood-requirement/BloodRequirementDashboard";
import BloodSearch from "../pages/blood-requirement/BloodSearch";
import NearbyBloodBanks from "../pages/blood-requirement/NearbyBloodBanks";
import MyBloodRequests from "../pages/blood-requirement/MyBloodRequests";
import SavedDonors from "../pages/blood-requirement/SavedDonors";
import BloodRequirementEligibility from "../pages/blood-requirement/BloodRequirementEligibility";
import BloodRequirementGuidelines from "../pages/blood-requirement/BloodRequirementGuidelines";
import BloodRequirementAbout from "../pages/blood-requirement/About";
import BloodRequirementContact from "../pages/blood-requirement/Contact";

// =========================================================
// ORGAN DONATION
// =========================================================

import OrganDonationLayout from "../pages/organ/OrganDonationLayout";
import OrganDonationDashboard from "../pages/organ/OrganDonationDashboard";
import OrganDonorRegistration from "../pages/organ/OrganDonorRegistration";
import OrganDonationHistory from "../pages/organ/OrganDonationHistory";
import OrganEligibility from "../pages/organ/OrganEligibility";
import OrganGuidelines from "../pages/organ/OrganGuidelines";
import OrganRequests from "../pages/organ/OrganRequests";
import OrganBanks from "../pages/organ/OrganBanks";
import OrganDonationAbout from "../pages/organ/About";
import OrganDonationContact from "../pages/organ/Contact";

// =========================================================
// ORGAN REQUIREMENT
// =========================================================

import OrganRequirementLayout from "../pages/organ-requirement/OrganRequirementLayout";
import OrganRequirementDashboard from "../pages/organ-requirement/OrganRequirementDashboard";
import SearchOrgan from "../pages/organ-requirement/SearchOrgan";
import NearbyOrganBanks from "../pages/organ-requirement/NearbyOrganBanks";
import MyOrganRequests from "../pages/organ-requirement/MyOrganRequests";
import SavedOrganDonors from "../pages/organ-requirement/SavedOrganDonors";
import CreateOrganRequirement from "../pages/organ-requirement/CreateOrganRequirement";
import OrganRequirementDetails from "../pages/organ-requirement/OrganRequirementDetails";
import OrganDonorResponses from "../pages/organ-requirement/OrganDonorResponses";
import OrganRequirementEligibility from "../pages/organ-requirement/OrganRequirementEligibility";
import OrganRequirementGuidelines from "../pages/organ-requirement/OrganRequirementGuidelines";
import OrganRequirementAbout from "../pages/organ-requirement/About";
import OrganRequirementContact from "../pages/organ-requirement/Contact";

// =========================================================
// PRESCRIPTION 
// =========================================================
import PrescriptionLayout from "../pages/prescription/PrescriptionLayout";
import PrescriptionAbout from "../pages/prescription/About";
import PrescriptionContact from "../pages/prescription/contact";
import PrescriptionGuidelines from "../pages/prescription/PrescriptionGuidelines";
import PrescriptionDashboard from "../pages/prescription/PrescriptionDashboard";
import UploadPrescription from "../pages/prescription/UploadPrescription";
import PrescriptionPreview from "../pages/prescription/PrescriptionPreview";
import PrescriptionProcessing from "../pages/prescription/PrescriptionProcessing";
import PrescriptionAnalysisComplete from "../pages/prescription/PrescriptionAnalysisComplete";
import PrescriptionResults from "../pages/prescription/PrescriptionResults";
import MedicineDetails from "../pages/prescription/MedicineDetails";
import PrescriptionHistory from "../pages/prescription/PrescriptionHistory";
import PrescriptionHistoryDetails from "../pages/prescription/PrescriptionHistoryDetails";
import PrescriptionReport from "../pages/prescription/PrescriptionReport";


// =========================================================
// MEDICINE RECOMMENDER
// =========================================================

import MedicineLayout from "../pages/medicine-recommender/MedicineLayout";
import MedicineDashboard from "../pages/medicine-recommender/MedicineDashboard";
import MedicineAbout from "../pages/medicine-recommender/About";
import MedicineContact from "../pages/medicine-recommender/Contact";

// =========================================================
// APP ROUTES
// =========================================================

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPortal />} />

      {/* =====================================================
          LANDING PAGE
          ===================================================== */}

      <Route
        path="/"
        element={<LandingEntry />}
      />

      {/* =====================================================
          PUBLIC PAGES
          ===================================================== */}

      <Route
        path="/about"
        element={<About />}
      />

      <Route
        path="/services"
        element={<RequireLogin><Services /></RequireLogin>}
      />

      <Route
        path="/contact"
        element={<Contact />}
      />

      {/* =====================================================
          AUTHENTICATION
          ===================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Legal />} />
      <Route path="/privacy" element={<Legal privacy />} />

      

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* =====================================================
          BLOOD DONATION
          ===================================================== */}

      <Route
        path="/blood-donation"
        element={<RequireLogin><BloodDonationLayout /></RequireLogin>}
      >
        <Route
          index
          element={<BloodDonationDashboard />}
        />

        <Route
          path="register"
          element={<BloodDonorRegistration />}
        />

        <Route
          path="donations"
          element={<BloodDonationHistory />}
        />

        <Route
          path="eligibility"
          element={<BloodEligibility />}
        />

        <Route
          path="guidelines"
          element={<BloodGuidelines />}
        />

        <Route
          path="requests"
          element={<BloodRequests />}
        />

        <Route
          path="banks"
          element={<BloodBanks />}
        />

        <Route
          path="about"
          element={<BloodDonationAbout />}
        />

        <Route
          path="contact"
          element={<BloodDonationContact />}
        />
      </Route>

      {/* =====================================================
          BLOOD REQUIREMENT
          ===================================================== */}

      <Route
        path="/blood-requirement"
        element={<RequireLogin><BloodRequirementLayout /></RequireLogin>}
      >
        <Route
          index
          element={<BloodRequirementDashboard />}
        />

        <Route
          path="search"
          element={<BloodSearch />}
        />

        <Route
          path="nearby-blood-banks"
          element={<NearbyBloodBanks />}
        />

        <Route
          path="my-requests"
          element={<MyBloodRequests />}
        />

        <Route
          path="saved-donors"
          element={<SavedDonors />}
        />

        <Route
          path="eligibility"
          element={<BloodRequirementEligibility />}
        />

        <Route
          path="guidelines"
          element={<BloodRequirementGuidelines />}
        />

        <Route
          path="about"
          element={<BloodRequirementAbout />}
        />

        <Route
          path="contact"
          element={<BloodRequirementContact />}
        />
      </Route>

      {/* =====================================================
          ORGAN DONATION
          ===================================================== */}

      <Route
        path="/organ-donation"
        element={<RequireLogin><OrganDonationLayout /></RequireLogin>}
      >
        <Route
          index
          element={<OrganDonationDashboard />}
        />

        <Route
          path="register"
          element={<OrganDonorRegistration />}
        />

        <Route
          path="history"
          element={<OrganDonationHistory />}
        />

        <Route
          path="eligibility"
          element={<OrganEligibility />}
        />

        <Route
          path="guidelines"
          element={<OrganGuidelines />}
        />

        <Route
          path="requests"
          element={<OrganRequests />}
        />

        <Route
          path="organ-banks"
          element={<OrganBanks />}
        />

        <Route
          path="about"
          element={<OrganDonationAbout />}
        />

        <Route
          path="contact"
          element={<OrganDonationContact />}
        />
      </Route>

      {/* =====================================================
          ORGAN REQUIREMENT
          ===================================================== */}

      <Route
        path="/organ-requirement"
        element={<RequireLogin><OrganRequirementLayout /></RequireLogin>}
      >
        <Route
          index
          element={<OrganRequirementDashboard />}
        />

        <Route
          path="search"
          element={<SearchOrgan />}
        />

        <Route
          path="nearby-organ-banks"
          element={<NearbyOrganBanks />}
        />

        <Route
          path="my-requests"
          element={<MyOrganRequests />}
        />

        <Route
          path="saved-organ-donors"
          element={<SavedOrganDonors />}
        />

        <Route
          path="eligibility"
          element={<OrganRequirementEligibility />}
        />

        <Route
          path="guidelines"
          element={<OrganRequirementGuidelines />}
        />

        <Route
          path="create"
          element={<CreateOrganRequirement />}
        />

        <Route
          path="details/:requirementId"
          element={<OrganRequirementDetails />}
        />

        <Route
          path="donor-responses/:requirementId"
          element={<OrganDonorResponses />}
        />

        <Route
          path="about"
          element={<OrganRequirementAbout />}
        />

        <Route
          path="contact"
          element={<OrganRequirementContact />}
        />
      </Route>

           {/* =====================================================
    PRESCRIPTION ANALYZER
    ===================================================== */}

<Route path="/prescription" element={<RequireLogin><PrescriptionLayout /></RequireLogin>}>
  <Route
    index
    element={<Navigate to="dashboard" replace />}
  />
<Route path="dashboard" element={<PrescriptionDashboard />} />
  <Route
    path="upload"
    element={<UploadPrescription />}
  />

  <Route
    path="preview"
    element={<PrescriptionPreview />}
  />

  <Route
    path="processing"
    element={<PrescriptionProcessing />}
  />

  <Route
    path="complete"
    element={<PrescriptionAnalysisComplete />}
  />

  <Route
    path="results"
    element={<PrescriptionResults />}
  />

  <Route
    path="medicine"
    element={<MedicineDetails />}
  />

  <Route
    path="history"
    element={<PrescriptionHistory />}
  />

  <Route
    path="history-details"
    element={<PrescriptionHistoryDetails />}
  />

  <Route
    path="report"
    element={<PrescriptionReport />}
  />
  <Route path="health-guidelines" element={<PrescriptionGuidelines />} />
  <Route path="medicine-information" element={<PrescriptionGuidelines />} />
  <Route path="about" element={<PrescriptionAbout />} />
  <Route path="contact" element={<PrescriptionContact />} />
</Route>

// =========================================================
// MEDICINE RECOMMENDER
// ========================================================= */

<Route
  path="/medicine-recommender"
  element={<RequireLogin><MedicineLayout /></RequireLogin>}
>
  <Route
    index
    element={<MedicineDashboard />}
  />

  <Route
    path="about"
    element={<MedicineAbout />}
  />

  <Route
    path="contact"
    element={<MedicineContact />}
  />
</Route>     

      {/* =====================================================
          FALLBACK
          ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}

export default AppRoutes;