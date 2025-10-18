import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Building2,
  Target,
  ArrowRight,
  CheckCircle,
  Star,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { surveysAPI } from '../utils/api';
import SurveyPrompt from '../components/SurveyPrompt';
import toast from 'react-hot-toast';

const Home = () => {
  const { isAuthenticated } = useAuth();

  // === Surveys state (only used when logged in) ===
  const [eligible, setEligible] = useState([]);
  const [survLoading, setSurvLoading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [activeSurvey, setActiveSurvey] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        setSurvLoading(true);
        // Returns list of surveys the user can take
        const data = await surveysAPI.forMe();
        setEligible(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e?.message || 'Failed to load surveys.');
      } finally {
        setSurvLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const openSurvey = (survey) => {
    setActiveSurvey(survey);
    setPromptOpen(true);
  };

  const onSurveySubmitted = () => {
    // remove submitted survey from the list
    setEligible((prev) => prev.filter((s) => s._id !== activeSurvey?._id));
  };

  const features = [
    {
      icon: Briefcase,
      title: 'Job Search',
      description: 'Find OJT and internship opportunities from accredited aerospace companies.',
    },
    {
      icon: Users,
      title: 'Student & Alumni Network',
      description: 'Connect with fellow students and alumni for mentorship and opportunities.',
    },
    {
      icon: Building2,
      title: 'Company Directory',
      description: 'Access a comprehensive directory of aviation and aerospace companies.',
    },
    {
      icon: Target,
      title: 'Career Development',
      description: 'Get guidance and resources for your career growth in the aerospace industry.',
    },
  ];

  const stats = [
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
              Launch Your AeroJobs Career
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Connect with the best OJT and internship opportunities in the aviation industry. 
              Exclusive platform for Philippine State College of Aeronautics students and alumni.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Available Surveys (only for logged-in users) */}
      {isAuthenticated && (
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold text-gray-900">
                Available Surveys
              </h2>
              {survLoading && <span className="text-sm opacity-70">Loading…</span>}
            </div>

            <div className="grid gap-4">
              {eligible.map((s) => (
                <div key={s._id} className="card">
                  <div className="card-body flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      {s.description ? (
                        <div className="text-sm text-gray-600">{s.description}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openSurvey(s)}
                    >
                      Take Survey
                    </button>
                  </div>
                </div>
              ))}

              {!survLoading && !eligible.length && (
                <div className="text-sm opacity-70">No surveys available right now.</div>
              )}
            </div>
          </div>

          {/* Controlled Survey Modal */}
        <SurveyPrompt
          open={promptOpen}
          onClose={() => setPromptOpen(false)}
          survey={activeSurvey}
          onSubmitted={onSurveySubmitted}
        />
        </section>
      )}

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
              Why Choose AeroJob?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Designed specifically for aviation students and professionals, 
              we provide the tools and connections you need to succeed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Briefcase, title: 'Job Search', description: 'Find OJT and internship opportunities from accredited aerospace companies.' },
              { icon: Users, title: 'Student & Alumni Network', description: 'Connect with fellow students and alumni for mentorship and opportunities.' },
              { icon: Building2, title: 'Company Directory', description: 'Access a comprehensive directory of aviation and aerospace companies.' },
              { icon: Target, title: 'Career Development', description: 'Get guidance and resources for your career growth in the aerospace industry.' },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
              Benefits for Students & Alumni
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Verified Opportunities
              </h3>
              <p className="text-gray-600">
                All companies and job postings are verified and accredited by the college.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-warning-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-warning-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Exclusive Access
              </h3>
              <p className="text-gray-600">
                Get access to opportunities not available to the general public.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Career Support
              </h3>
              <p className="text-gray-600">
                Receive guidance from career counselors and industry professionals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to Take Off?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
            Join hundreds of students and alumni who have launched their aerospace careers through AeroJob.
          </p>
          {!isAuthenticated ? (
            <Link
              to="/register"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 inline-flex items-center space-x-2"
            >
              <span>Create Your Account</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <Link
              to="/jobs"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 inline-flex items-center space-x-2"
            >
              <span>Browse Jobs</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
