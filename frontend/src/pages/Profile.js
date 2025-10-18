import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  User,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  GraduationCap,
  Camera,
  Save,
  Edit3,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import http, { profileAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const { updateUser } = useAuth() || {};
  const photoInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const splitName = (fullName = '') => {
    const parts = fullName.trim().split(/\s+/);
    if (!parts.length) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  const normalizeProfile = (p) => {
    if (!p) return p;
    const { firstName, lastName } = splitName(p.fullName || '');
    return { ...p, firstName, lastName };
  };

  const formatForSubmit = (data) => {
    const payload = { ...data };

    // combine first/last into fullName (your schema)
    payload.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();

    // only send fields your Profile schema supports
    const allowed = [
      'fullName',
      'email',
      'role',
      'avatarUrl',
      'bio',
      'course',
      'yearLevel',
      'contactNumber',
      'address',
      'studentId'
    ];
    Object.keys(payload).forEach((k) => {
      if (!allowed.includes(k)) delete payload[k];
    });

    return payload;
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await profileAPI.getMe(); // { user, profile } or profile
        const serverProfile = data.profile ?? data;
        const uiProfile = normalizeProfile(serverProfile);
        if (isMounted) {
          setProfile(uiProfile);
          reset(uiProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      const payload = formatForSubmit(data);
      const updatedData = await profileAPI.updateMe(payload);
      const updatedProfile = normalizeProfile(updatedData.profile ?? updatedData);

      // Update local form/profile
      setProfile(updatedProfile);
      reset(updatedProfile);
      setEditing(false);

      // Update header immediately
      if (typeof updateUser === 'function') {
        const [first, ...rest] = (updatedProfile.fullName || '').trim().split(/\s+/);
        const last = rest.join(' ');
        updateUser({
          name: updatedProfile.fullName,
          fullName: updatedProfile.fullName,
          firstName: first || '',
          lastName: last || '',
          role: updatedProfile.role,
          userType: updatedProfile.role,
          avatarUrl: updatedProfile.avatarUrl,
          email: updatedProfile.email,
        });
      }

      toast.success('Profile saved');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    reset(profile);
    setEditing(false);
  };

  const handleEditPicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const { data } = await http.post('/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedProfile = normalizeProfile(data.profile ?? data);
      setProfile(updatedProfile);
      reset(updatedProfile);

      if (typeof updateUser === 'function') {
        updateUser({ avatarUrl: updatedProfile.avatarUrl });
      }

      toast.success('Profile photo updated');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      toast.error(error?.message || 'Failed to update photo');
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  if (!profile) return <div>Profile not found</div>;

  const ProfileField = ({ icon: Icon, label, value, editable = true, children }) => (
    <div className="flex items-center space-x-3 py-3 border-b border-gray-200 last:border-b-0">
      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary-600" />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {editing && editable ? children : (
          <p className="text-gray-900">{value || 'Not provided'}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">
            Profile
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your personal information and preferences
          </p>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleCancelEdit}
              className="btn btn-outline flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('profile-form')?.requestSubmit()} // ✅ always triggers submit
              disabled={saving}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Picture */}
        <div className="lg:col-span-1">
          <div className="card p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mx-auto overflow-hidden">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-primary-600" />
                )}
              </div>

              {editing && (
                <label className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50">
                  <Camera className="w-4 h-4 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditPicture}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="btn btn-outline flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Change Photo</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handleEditPicture}
                className="hidden"
              />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              {profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
            </h2>
            <p className="text-gray-600 capitalize">{profile.role}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Personal Information
            </h3>

            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileField icon={User} label="First Name" value={profile.firstName} editable>
                  <input
                    type="text"
                    {...register('firstName', {
                      required: 'First name is required',
                      minLength: { value: 2, message: 'First name must be at least 2 characters' }
                    })}
                    className="input"
                    disabled={!editing}
                    defaultValue={profile.firstName}
                  />
                  {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
                </ProfileField>

                <ProfileField icon={User} label="Last Name" value={profile.lastName} editable>
                  <input
                    type="text"
                    {...register('lastName', {
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'Last name must be at least 2 characters' }
                    })}
                    className="input"
                    disabled={!editing}
                    defaultValue={profile.lastName}
                  />
                  {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
                </ProfileField>
              </div>

              <ProfileField icon={Mail} label="Email" value={profile.email} editable={false}>
                <input
                  type="email"
                  value={profile.email || ''}
                  className="input bg-gray-100"
                  disabled
                  readOnly
                />
              </ProfileField>

              <ProfileField icon={Phone} label="Phone" value={profile.contactNumber} editable>
                <input
                  type="tel"
                  {...register('contactNumber')}
                  className="input"
                  placeholder="Enter your phone number"
                  disabled={!editing}
                  defaultValue={profile.contactNumber}
                />
              </ProfileField>

              <ProfileField icon={MapPin} label="Address" value={profile.address} editable>
                <textarea
                  {...register('address')}
                  className="input"
                  rows={3}
                  placeholder="Enter your address"
                  disabled={!editing}
                  defaultValue={profile.address}
                />
              </ProfileField>

              {(profile.role === 'student' || profile.role === 'alumni') && (
                <>
                  <ProfileField icon={BookOpen} label="Student ID" value={profile.studentId} editable>
                    <input
                      type="text"
                      {...register('studentId')}
                      className="input"
                      placeholder="Enter your student ID"
                      disabled={!editing}
                      defaultValue={profile.studentId}
                    />
                  </ProfileField>

                  <ProfileField icon={GraduationCap} label="Course" value={profile.course} editable>
                    <select
                      {...register('course')}
                      className="input"
                      defaultValue={profile.course || ''}
                      disabled={!editing}
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
                        <option value="BS in Aviation Communication Major in Flight Operations">BS in Aviation Communication Major in Flight Operations</option>
                        <option value="BS in Aviation Tourism Major in Travel Management">BS in Aviation Tourism Major in Travel Management</option>
                        <option value="BS in Supply Management with Specialization in Aviation Logistics">BS in Supply Management with Specialization in Aviation Logistics</option>
                        <option value="BS in Aviation Safety and Security Management">BS in Aviation Safety and Security Management</option>
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
                        <option value="Master of Education in Aeronautical Management">Master of Education in Aeronautical Management</option>
                        <option value="Master in Public Administration Major in Government and Airport Administration">
                          Master in Public Administration Major in Government and Airport Administration
                        </option>
                      </optgroup>
                    </select>
                  </ProfileField>

                  <ProfileField icon={GraduationCap} label="Year Level" value={profile.yearLevel} editable>
                    <select
                      {...register('yearLevel')}
                      className="input"
                      defaultValue={profile.yearLevel || ''}
                      disabled={!editing}
                    >
                      <option value="">Select year level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Graduate">Graduate</option>
                    </select>
                  </ProfileField>
                </>
              )}
            </div>

            {/* Bio */}
            <div className="mt-6">
              <label className="form-label">Bio</label>
              {editing ? (
                <textarea
                  {...register('bio')}
                  className="input"
                  rows={4}
                  placeholder="Tell us about yourself..."
                  defaultValue={profile.bio}
                />
              ) : (
                <p className="text-gray-900">{profile.bio || 'Not provided'}</p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
