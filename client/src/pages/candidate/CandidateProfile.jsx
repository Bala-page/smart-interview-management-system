import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../../services/api';
import { updateUser } from '../../store/authSlice';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconUpload, IconFileText, IconCheck } from '../../components/Icons';

export const CandidateProfile = () => {
  const dispatch = useDispatch();

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: '',
    experience: 0,
    bio: '',
    resumeFileId: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Resume upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [parseResult, setParseResult] = useState(null);

  const fetchProfile = async () => {
    try {
      const res = await api.getMe();
      if (res.success) {
        const u = res.data;
        setProfile({
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          location: u.location || '',
          skills: (u.skills || []).join(', '),
          experience: u.experience || 0,
          bio: u.bio || '',
          resumeFileId: u.resumeFileId || null,
        });
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        location: profile.location,
        skills: profile.skills.split(',').map((s) => s.trim()).filter(Boolean),
        experience: Number(profile.experience) || 0,
        bio: profile.bio,
      };

      const res = await api.updateProfile(payload);
      if (res.success) {
        dispatch(updateUser(res.data));
        setSuccessMsg('Profile details updated successfully!');
      }
    } catch (err) {
      setErrorMsg(err.response?.message || err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Please choose a PDF file (.pdf)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleResumeUpload = async () => {
    if (!selectedFile) return;

    setUploadingResume(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);

      const res = await api.uploadResume(formData);
      if (res.success) {
        setParseResult(res.data);
        setProfile((prev) => ({ ...prev, resumeFileId: res.data.fileId }));
        dispatch(updateUser({ resumeFileId: res.data.fileId }));
        setSuccessMsg('PDF Resume uploaded and parsed locally via pdf-parse!');
        // Refresh profile
        fetchProfile();
      }
    } catch (err) {
      setErrorMsg(err.response?.message || err.message || 'Resume upload failed');
    } finally {
      setUploadingResume(false);
      setSelectedFile(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading candidate profile..." />;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Candidate Profile & Resume Portfolio
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Upload your resume for local automated parsing and update professional information
          </p>
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--success-light)',
            color: 'var(--success-hover)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--success-border)',
            fontSize: '0.85rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconCheck size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger-hover)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--danger-border)',
            fontSize: '0.85rem',
            marginBottom: 20,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Resume Upload Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Resume Document (PDF)</h3>
          {profile.resumeFileId && (
            <a
              href={api.getResumeUrl(profile.resumeFileId)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              <IconFileText size={15} /> View Uploaded Resume PDF
            </a>
          )}
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', marginBottom: 16 }}>
          Upload your resume in PDF format. The system will parse your document locally using{' '}
          <code>pdf-parse</code> and identify verified engineering skills for automated screening.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".pdf"
            onChange={handleResumeFileChange}
            id="resume-file-input"
            style={{ display: 'none' }}
          />

          <label htmlFor="resume-file-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <IconUpload size={15} /> {selectedFile ? selectedFile.name : 'Select PDF File'}
          </label>

          {selectedFile && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleResumeUpload}
              disabled={uploadingResume}
            >
              {uploadingResume ? 'Parsing PDF Locally...' : 'Upload & Parse Resume'}
            </button>
          )}
        </div>

        {/* Local Parse Result Summary */}
        {parseResult && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: 6 }}>
              Local PDF Extraction Results:
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginBottom: 10 }}>
              Detected Experience: <strong>{parseResult.detectedExperience ? `${parseResult.detectedExperience} years` : 'Not explicitly stated in text'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', display: 'block', marginBottom: 4 }}>
                Skills Discovered in Resume ({parseResult.extractedSkills?.length || 0}):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {parseResult.extractedSkills?.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: 'var(--success-light)',
                      color: 'var(--success-hover)',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid var(--success-border)',
                    }}
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Form Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Personal & Professional Details</h3>
        </div>

        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              name="name"
              className="form-control"
              value={profile.name}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                className="form-control"
                value={profile.email}
                style={{ backgroundColor: 'var(--slate-100)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="form-control"
                value={profile.phone}
                onChange={handleProfileChange}
                placeholder="+1-555-0100"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                name="location"
                className="form-control"
                value={profile.location}
                onChange={handleProfileChange}
                placeholder="e.g. San Francisco, CA or Remote"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                name="experience"
                className="form-control"
                value={profile.experience}
                onChange={handleProfileChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Skills (Comma separated)</label>
            <input
              type="text"
              name="skills"
              className="form-control"
              value={profile.skills}
              onChange={handleProfileChange}
              placeholder="React, JavaScript, Node.js, MongoDB, Express"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Professional Summary</label>
            <textarea
              name="bio"
              rows="4"
              className="form-control"
              value={profile.bio}
              onChange={handleProfileChange}
              placeholder="Summary of engineering focus, architectures, and career achievements..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
