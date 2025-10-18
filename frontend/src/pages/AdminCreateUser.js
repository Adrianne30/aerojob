// src/pages/AdminCreateUser.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  GraduationCap,
  Save,
  X,
} from 'lucide-react';
import { usersAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminCreateUser = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState({ type: null, text: '' });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
    reset,
  } = useForm({
    defaultValues: {
      userType: 'student', // default selection for radios
      course: '',
      yearLevel: '',
    },
  });

  const userType = watch('userType');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setBanner({ type: null, text: '' });

      // Compose payload for /api/admin/users
      const userData = {
        userType: data.userType, // 'student' | 'alumni' | 'admin' (server lowercases role)
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        email: data.email?.trim().toLowerCase(),
        password: data.password,
        studentId: (data.userType === 'student' || data.userType === 'alumni') ? data.studentId?.trim() : undefined,
        course: data.userType === 'student' ? data.course : undefined,
        yearLevel: data.userType === 'student' ? data.yearLevel : undefined,
        phone: data.phone?.trim() || undefined,
        status: 'active',
        // these are harmless if your schema ignores them:
        isEmailVerified: true,
        isActive: true,
      };

      // NOTE: usersAPI.createUser is an alias to usersAPI.create and returns the user object (not { success: true }).
      const created = await usersAPI.createUser(userData);

      if (created && created._id) {
        setBanner({ type: 'success', text: 'User created successfully.' });
        reset();
        navigate('/admin/users', {
          state: { success: true, message: 'The user has been created successfully' },
        });
        return;
      }

      throw new Error('Unexpected response from server');
    } catch (error) {
      const msg = error?.message || 'Error in creating a new user';
      console.error('Error creating user:', error);
      setError('root', { type: 'manual', message: msg });
      setBanner({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigate('/admin/users');

  const userTypes = [
    { value: 'student', label: 'Student', icon: BookOpen },
    { value: 'alumni', label: 'Alumni', icon: GraduationCap },
    { value: 'admin', label: 'Admin', icon: User },
  ];

  const yearLevels = [
    { value: '4th Year', label: '4th Year' },
    { value: 'Graduate', label: 'Graduate' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">Create New User</h1>
          <p className="text-gray-600 mt-1">Add a new user to the AeroJob platform</p>
        </div>

        <div className="flex space-x-2">
          <button onClick={handleCancel} className="btn btn-outline flex items-center space-x-2" type="button">
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            form="create-user-form"
            disabled={loading}
            className="btn btn-primary flex items-center space-x-2"
          >
            {loading ? (
              <LoadingSpinner size="small" text="" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Create User</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {banner.type && (
        <div
          className={
            'mb-6 rounded-md border p-3 text-sm ' +
            (banner.type === 'success'
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-red-300 bg-red-50 text-red-700')
          }
        >
          {banner.text}
        </div>
      )}

      <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

            {/* User Type */}
            <div>
              <label className="form-label">User Type</label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {userTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <label
                      key={type.value}
                      className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-3 hover:border-primary-500 has-[:checked]:border-primary-600 has-[:checked]:ring-2 has-[:checked]:ring-primary-600"
                    >
                      <input
                        type="radio"
                        value={type.value}
                        className="sr-only"
                        {...register('userType', { required: 'Please select user type' })}
                      />
                      <div className="flex flex-col items-center text-center">
                        <Icon className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-sm font-medium text-gray-900">{type.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.userType && <p className="form-error">{errors.userType.message}</p>}
            </div>

            {/* First Name */}
            <div>
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="input"
                placeholder="Enter first name"
                {...register('firstName', {
                  required: 'First name is required',
                  minLength: { value: 2, message: 'First name must be at least 2 characters' },
                })}
              />
              {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="input"
                placeholder="Enter last name"
                {...register('lastName', {
                  required: 'Last name is required',
                  minLength: { value: 2, message: 'Last name must be at least 2 characters' },
                })}
              />
              {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="Enter email address (must be @philsca.edu.ph)"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Za-z0-9._%+-]+@philsca\.edu\.ph$/,
                      message: 'Only @philsca.edu.ph emails are allowed',
                    },
                  })}
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="Create a password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            {/* Student/Alumni Specific Fields */}
            {(userType === 'student' || userType === 'alumni') && (
              <>
                <div>
                  <label className="form-label">Student ID</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter student ID"
                    {...register('studentId', {
                      required: userType === 'student' ? 'Student ID is required for students' : false,
                    })}
                  />
                  {errors.studentId && <p className="form-error">{errors.studentId.message}</p>}
                </div>

                {/* Course */}
                <div>
                  <label className="form-label">Course</label>
                  <select
                    className="input"
                    {...register('course', {
                      required: userType === 'student' ? 'Course is required for students' : false,
                    })}
                  >
                    <option value="">Select your course</option>

                    <optgroup label="INSTITUTE OF ENGINEERING AND TECHNOLOGY">
                      <option value="BS in Aeronautical Engineering">BS in Aeronautical Engineering</option>
                      <option value="BS in Air Transportation Major in Advance Flying">BS in Air Transportation Major in Advance Flying</option>
                      <option value="BS in Aircraft Maintenance Technology">BS in Aircraft Maintenance Technology</option>
                      <option value="BS in Aviation Electronics Technology">BS in Aviation Electronics Technology</option>
                      <option value="Associate in Aircraft Maintenance Technology">Associate in Aircraft Maintenance Technology</option>
                      <option value="Associate in Aviation Electronics Technology">Associate in Aviation Electronics Technology</option>
                    </optgroup>

                    <optgroup label="INSTITUTE OF LIBERAL ARTS AND SCIENCES">
                      <option value="BS in Aviation Communication Major in Flight Operations">
                        BS in Aviation Communication Major in Flight Operations
                      </option>
                      <option value="BS in Aviation Tourism Major in Travel Management">
                        BS in Aviation Tourism Major in Travel Management
                      </option>
                      <option value="BS in Supply Management with Specialization in Aviation Logistics">
                        BS in Supply Management with Specialization in Aviation Logistics
                      </option>
                      <option value="BS in Aviation Safety and Security Management">
                        BS in Aviation Safety and Security Management
                      </option>
                    </optgroup>

                    <optgroup label="INSTITUTE OF COMPUTER STUDIES">
                      <option value="BS in Information Technology with Specialization in Aviation Information Technology">
                        BS in Information Technology with Specialization in Aviation Information Technology
                      </option>
                      <option value="BS in Information System with Specialization in Aviation Information System">
                        BS in Information System with Specialization in Aviation Information System
                      </option>
                    </optgroup>

                    <optgroup label="INSTITUTE OF GRADUATE STUDIES">
                      <option value="Master of Education in Aeronautical Management">
                        Master of Education in Aeronautical Management
                      </option>
                      <option value="Master in Public Administration Major in Government and Airport Administration">
                        Master in Public Administration Major in Government and Airport Administration
                      </option>
                    </optgroup>
                  </select>
                  {errors.course && <p className="form-error">{errors.course.message}</p>}
                </div>

                <div>
                  <label className="form-label">Year Level</label>
                  <select
                    className="input"
                    {...register('yearLevel', {
                      required: userType === 'student' ? 'Year level is required for students' : false,
                    })}
                  >
                    <option value="">Select year level</option>
                    {yearLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  {errors.yearLevel && <p className="form-error">{errors.yearLevel.message}</p>}
                </div>
              </>
            )}

            {/* Phone Number */}
            <div>
              <label className="form-label">Phone Number (Optional)</label>
              <input type="tel" className="input" placeholder="Enter phone number" {...register('phone')} />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errors.root && (
          <div className="mt-6 rounded-md bg-error-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <User className="h-5 w-5 text-error-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800">{errors.root.message}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Success Message if redirected with state */}
        {location?.state?.message && (
          <div className="mt-6 rounded-md bg-success-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <User className="h-5 w-5 text-success-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-success-800">{location.state.message}</h3>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AdminCreateUser;
