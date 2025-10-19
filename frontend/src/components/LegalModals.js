import React, { useState } from "react";
import { X } from "lucide-react";
import logo from "../assets/logo.png"; // ✅ adjust path if your logo is elsewhere

export default function LegalModals() {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (type) => setActiveModal(type);
  const closeModal = () => setActiveModal(null);

  return (
    <div className="text-center text-sm text-gray-600 mt-6">
      <p>
        By using this platform, you agree to our{" "}
        <button
          onClick={() => openModal("terms")}
          className="text-blue-600 hover:underline"
        >
          Terms & Conditions
        </button>{" "}
        and{" "}
        <button
          onClick={() => openModal("privacy")}
          className="text-blue-600 hover:underline"
        >
          Privacy Policy
        </button>
        .
      </p>

      {/* --- Modal Overlay --- */}
      {activeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          {/* --- Modal Box --- */}
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* --- Header --- */}
            <div className="bg-[#052940] text-white flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <img src={logo} alt="AeroJob Logo" className="h-8 w-8" />
                <h2 className="text-lg font-semibold">
                  {activeModal === "terms"
                    ? "Terms and Conditions"
                    : "Privacy Policy"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* --- Content --- */}
            <div className="p-6 overflow-y-auto max-h-[75vh] text-gray-700 text-sm leading-relaxed">
              {activeModal === "terms" ? (
                <>
                  <p>
                    Welcome to <strong>AeroJob</strong>. By accessing or using
                    our platform, you agree to comply with these Terms and
                    Conditions. Please read them carefully before using the
                    service.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    1. Use of the Platform
                  </h3>
                  <p>
                    AeroJob provides internship and job-matching services for
                    PhilSCA students and alumni. You agree to use the platform
                    responsibly and only for lawful purposes related to career
                    opportunities.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    2. Account Responsibility
                  </h3>
                  <p>
                    You are responsible for maintaining the confidentiality of
                    your login credentials. AeroJob will not be liable for any
                    loss or damage caused by unauthorized account access.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    3. Data Accuracy
                  </h3>
                  <p>
                    You agree to provide accurate and truthful information in
                    your profile and job applications. Misleading data may lead
                    to suspension or removal of your account.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    4. Intellectual Property
                  </h3>
                  <p>
                    All logos, trademarks, and content on this platform belong
                    to AeroJob. Copying or distributing any content without
                    permission is strictly prohibited.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    5. Limitation of Liability
                  </h3>
                  <p>
                    AeroJob is not liable for any direct or indirect losses
                    arising from the use of job postings, company listings, or
                    third-party links available on the platform.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    6. Changes to Terms
                  </h3>
                  <p>
                    We may update these Terms from time to time. Continued use
                    of the platform after such changes constitutes acceptance of
                    the updated Terms.
                  </p>

                  <p className="mt-4">
                    For questions, contact us at{" "}
                    <a
                      href="mailto:support@aerojob.space"
                      className="text-blue-600 hover:underline"
                    >
                      support@aerojob.space
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <p>
                    At <strong>AeroJob</strong>, we value your privacy. This
                    Privacy Policy outlines how we collect, use, and protect
                    your personal data when you use our services.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    1. Information We Collect
                  </h3>
                  <p>
                    We collect data such as your name, email, school ID, contact
                    number, and job application details when you create an
                    account or apply for opportunities.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    2. How We Use Your Data
                  </h3>
                  <p>
                    Your data helps us match you with relevant job and
                    internship opportunities, communicate important updates, and
                    improve platform performance.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    3. Data Sharing
                  </h3>
                  <p>
                    We only share your information with partner companies for
                    job-matching purposes. We do not sell or rent personal data
                    to third parties.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    4. Data Protection
                  </h3>
                  <p>
                    We implement security measures to protect your information
                    from unauthorized access, alteration, or disclosure.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    5. Cookies
                  </h3>
                  <p>
                    AeroJob uses cookies to improve site functionality and track
                    analytics. You can disable cookies via your browser settings
                    if preferred.
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    6. Your Rights
                  </h3>
                  <p>
                    You may request access to, correction of, or deletion of
                    your personal data at any time by contacting us at{" "}
                    <a
                      href="mailto:support@aerojob.space"
                      className="text-blue-600 hover:underline"
                    >
                      support@aerojob.space
                    </a>
                    .
                  </p>

                  <h3 className="mt-4 font-semibold text-[#052940]">
                    7. Policy Updates
                  </h3>
                  <p>
                    We may revise this Privacy Policy periodically. Updates will
                    take effect upon posting to the AeroJob website.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
