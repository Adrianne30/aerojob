import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Linkedin,
  Instagram,
  X,
} from "lucide-react";
import logo from "../assets/logo.png"; // ✅ adjust if your logo path differs

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (type) => setActiveModal(type);
  const closeModal = () => setActiveModal(null);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-white">
                AeroJob
              </span>
            </div>
            <p className="text-gray-300 mb-4">
              Internship and Alumni Management System for the Philippine State
              College of Aeronautics. Connecting students and alumni with the
              best AeroJob opportunities.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.facebook.com/PhilscaOfficial/"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/philsca_ssc/#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/jobs"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Job Search
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 text-sm">
                  Philippine State College of Aeronautics
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 text-sm">+63 949 797 3079</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 text-sm">info@aerojob.ph</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {new Date().getFullYear()} AeroJob - Philippine State College of
              Aeronautics. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <button
                onClick={() => openModal("privacy")}
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => openModal("terms")}
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Modal Overlay --- */}
      {activeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
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
    </footer>
  );
};

export default Footer;
