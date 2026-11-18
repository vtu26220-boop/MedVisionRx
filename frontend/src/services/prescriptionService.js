const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


/**
 * Upload and analyze prescription
 */
export const analyzePrescription = async (
  file,
  userId = null
) => {
  if (!file) {
    throw new Error(
      "Please select a prescription file."
    );
  }

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  /*
   * Temporary user identifier.
   *
   * Once Login/Signup is completed,
   * this will come from AuthContext/JWT.
   */
  if (userId) {
    formData.append(
      "user_id",
      userId
    );
  }


  const response = await fetch(
    `${API_BASE_URL}/api/prescription/scan`,
    {
      method: "POST",
      body: formData,
    }
  );


  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Invalid response received from server."
    );
  }


  if (!response.ok) {
    throw new Error(
      result?.detail ||
      result?.message ||
      "Prescription analysis failed."
    );
  }


  return result;
};


/**
 * Get a prescription by ID
 */
export const getPrescription = async (
  prescriptionId
) => {
  const response = await fetch(
    `${API_BASE_URL}/api/prescription/${prescriptionId}`
  );


  const result =
    await response.json();


  if (!response.ok) {
    throw new Error(
      result?.detail ||
      "Unable to fetch prescription."
    );
  }


  return result;
};


/**
 * Get logged-in user's prescription history
 */
export const getPrescriptionHistory =
  async (userId) => {

    const url = new URL(
      `${API_BASE_URL}/api/prescription/history`
    );

    if (userId) {
      url.searchParams.set(
        "user_id",
        userId
      );
    }


    const response =
      await fetch(url.toString());


    const result =
      await response.json();


    if (!response.ok) {
      throw new Error(
        result?.detail ||
        "Unable to fetch prescription history."
      );
    }


    return result;
  };


/**
 * Delete a prescription
 */
export const deletePrescription =
  async (
    prescriptionId,
    userId
  ) => {

    const url = new URL(
      `${API_BASE_URL}/api/prescription/${prescriptionId}`
    );

    if (userId) {
      url.searchParams.set(
        "user_id",
        userId
      );
    }


    const response =
      await fetch(
        url.toString(),
        {
          method: "DELETE",
        }
      );


    const result =
      await response.json();


    if (!response.ok) {
      throw new Error(
        result?.detail ||
        "Unable to delete prescription."
      );
    }


    return result;
  };


/**
 * Get PDF report URL
 */
export const getPrescriptionReportUrl =
  (prescriptionId) => {

    return (
      `${API_BASE_URL}/api/prescription/` +
      `${encodeURIComponent(
        prescriptionId
      )}/report`
    );
  };


/**
 * Open prescription PDF
 */
export const openPrescriptionReport =
  (prescriptionId) => {

    const url =
      getPrescriptionReportUrl(
        prescriptionId
      );

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };


export default {
  analyzePrescription,
  getPrescription,
  getPrescriptionHistory,
  deletePrescription,
  getPrescriptionReportUrl,
  openPrescriptionReport,
};