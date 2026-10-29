import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconCheck,
  IconX,
  IconHelpCircle,
  IconFilter,
  IconEye,
  IconUpload,
} from '../../components/Icons';

export const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Form State
  const initialForm = {
    questionText: '',
    skill: '',
    difficulty: 'Medium',
    marks: 1,
    explanation: '',
    options: [
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
      { id: 'opt_3', text: '' },
      { id: 'opt_4', text: '' },
    ],
    correctAnswer: 'opt_1',
  };
  const [formData, setFormData] = useState(initialForm);
  const [importJsonText, setImportJsonText] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [page, search, selectedSkill, selectedDifficulty, statusFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.getQuestionStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch question stats:', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: 15,
        search,
        skill: selectedSkill,
        difficulty: selectedDifficulty,
        isActive: statusFilter,
      });

      const res = await api.getQuestions(params.toString());
      if (res.success) {
        setQuestions(res.data.questions || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = (q = null) => {
    if (q) {
      setEditingQuestion(q);
      setFormData({
        questionText: q.questionText,
        skill: q.skill,
        difficulty: q.difficulty,
        marks: q.marks || 1,
        explanation: q.explanation || '',
        options: q.options && q.options.length ? q.options : initialForm.options,
        correctAnswer: q.correctAnswer,
      });
    } else {
      setEditingQuestion(null);
      setFormData(initialForm);
    }
    setShowCreateModal(true);
  };

  const handleOptionTextChange = (index, text) => {
    const updated = [...formData.options];
    updated[index].text = text;
    setFormData({ ...formData, options: updated });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validation
    if (!formData.questionText.trim()) {
      setError('Question text is required.');
      return;
    }
    if (!formData.skill.trim()) {
      setError('Technical skill is required.');
      return;
    }
    for (let i = 0; i < formData.options.length; i++) {
      if (!formData.options[i].text.trim()) {
        setError(`Option ${String.fromCharCode(65 + i)} cannot be blank.`);
        return;
      }
    }

    try {
      if (editingQuestion) {
        await api.updateQuestion(editingQuestion._id, formData);
        setSuccessMsg('Question updated successfully.');
      } else {
        await api.createQuestion(formData);
        setSuccessMsg('Question created and added to Question Bank.');
      }
      setShowCreateModal(false);
      fetchQuestions();
      fetchStats();
    } catch (err) {
      setError(err.message || 'Failed to save question');
    }
  };

  const handleToggleStatus = async (q) => {
    try {
      await api.toggleQuestionStatus(q._id);
      fetchQuestions();
      fetchStats();
    } catch (err) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleImportJson = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const parsed = JSON.parse(importJsonText);
      const questionsArray = Array.isArray(parsed) ? parsed : parsed.questions;

      if (!Array.isArray(questionsArray)) {
        throw new Error('JSON must be an array of questions or contain a "questions" array.');
      }

      const res = await api.importQuestions(questionsArray);
      if (res.success) {
        setSuccessMsg(`Successfully imported ${res.data.importedCount} questions!`);
        setShowImportModal(false);
        setImportJsonText('');
        fetchQuestions();
        fetchStats();
      }
    } catch (err) {
      setError(`Import Error: ${err.message}`);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Question Bank Manager
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
            Curate and manage enterprise MCQ questions evaluated during online candidate assessments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <IconUpload size={16} />
            <span>Import JSON</span>
          </button>
          <button
            onClick={() => handleOpenCreate()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <IconPlus size={16} />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>TOTAL QUESTIONS</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{stats.totalQuestions}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>ACTIVE IN POOL</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a', marginTop: '4px' }}>{stats.totalActive}</div>
          </div>
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>COVERED SKILLS</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{stats.totalSkills}</div>
          </div>
        </div>
      )}

      {/* Skill Pool Distribution Chips */}
      {stats && stats.skills && stats.skills.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '10px' }}>
            QUESTION POOL BY SKILL (CLICK TO FILTER):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setSelectedSkill('')}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                background: selectedSkill === '' ? '#2563eb' : '#f8fafc',
                color: selectedSkill === '' ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              All Skills ({stats.totalQuestions})
            </button>
            {stats.skills.map((sk) => (
              <button
                key={sk.skill}
                onClick={() => setSelectedSkill(selectedSkill === sk.skill ? '' : sk.skill)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1px solid #cbd5e1',
                  background: selectedSkill === sk.skill ? '#2563eb' : '#ffffff',
                  color: selectedSkill === sk.skill ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{sk.skill}</span>
                <span style={{
                  background: selectedSkill === sk.skill ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}>
                  {sk.active} active
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search question text..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-control"
            style={{ paddingLeft: '34px' }}
          />
          <div style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}>
            <IconSearch size={16} />
          </div>
        </div>

        <select
          value={selectedDifficulty}
          onChange={(e) => { setSelectedDifficulty(e.target.value); setPage(1); }}
          className="form-control"
          style={{ width: '150px' }}
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="form-control"
          style={{ width: '140px' }}
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>

        {(search || selectedSkill || selectedDifficulty || statusFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedSkill('');
              setSelectedDifficulty('');
              setStatusFilter('');
              setPage(1);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Questions Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading Question Bank...
          </div>
        ) : questions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <IconHelpCircle size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 6px 0' }}>No questions match your criteria</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Try adjusting your search filters or click "Add Question" to create one.
            </p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Question</th>
                <th style={{ padding: '12px 16px' }}>Skill</th>
                <th style={{ padding: '12px 16px' }}>Difficulty</th>
                <th style={{ padding: '12px 16px' }}>Marks</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const diffBadgeStyle =
                  q.difficulty === 'Easy'
                    ? { background: '#dcfce7', color: '#15803d' }
                    : q.difficulty === 'Medium'
                    ? { background: '#fef3c7', color: '#b45309' }
                    : { background: '#fee2e2', color: '#b91c1c' };

                return (
                  <tr key={q._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <td style={{ padding: '14px 16px', maxWidth: '450px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                        {q.questionText}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {q.options?.length || 4} options • Correct: Option {q.options?.findIndex((o) => o.id === q.correctAnswer) + 1 || 1}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontWeight: '600' }}>
                        {q.skill}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{ ...diffBadgeStyle, fontWeight: '600' }}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#334155' }}>
                      {q.marks || 1} pt
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleToggleStatus(q)}
                        style={{
                          background: q.isActive ? '#dcfce7' : '#f1f5f9',
                          color: q.isActive ? '#15803d' : '#64748b',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {q.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="btn-icon"
                          title="Preview Question"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                        >
                          <IconEye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenCreate(q)}
                          className="btn-icon"
                          title="Edit Question"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                        >
                          <IconEdit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {questions.length} of {pagination.total} questions
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: '13px', fontWeight: '600' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Question Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card modal-content" style={{ width: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                {editingQuestion ? 'Edit Assessment Question' : 'Add New Assessment Question'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Question Text *
                </label>
                <textarea
                  rows="3"
                  className="form-control"
                  placeholder="e.g. Which hook is used to manage mutable values without re-rendering in React?"
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                    Skill *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. React"
                    value={formData.skill}
                    onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                    Difficulty *
                  </label>
                  <select
                    className="form-control"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                    Marks (Default: 1)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {/* Options */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px', display: 'block' }}>
                  Answer Options (Select the Radio for the Correct Answer) *
                </label>
                {formData.options.map((opt, idx) => (
                  <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="radio"
                      name="correctOptionRadio"
                      checked={formData.correctAnswer === opt.id}
                      onChange={() => setFormData({ ...formData, correctAnswer: opt.id })}
                      title="Set as correct answer"
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: '700', fontSize: '13px', width: '20px' }}>
                      {String.fromCharCode(65 + idx)}:
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Option ${String.fromCharCode(65 + idx)} statement`}
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Explanation (Shown on result review)
                </label>
                <textarea
                  rows="2"
                  className="form-control"
                  placeholder="Explain why the selected option is correct..."
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingQuestion ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card modal-content" style={{ width: '560px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontWeight: '600' }}>
                  {previewQuestion.skill}
                </span>
                <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: '600' }}>
                  {previewQuestion.difficulty}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{previewQuestion.marks} mark</span>
              </div>
              <button onClick={() => setPreviewQuestion(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '16px', lineHeight: '1.5' }}>
              {previewQuestion.questionText}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {previewQuestion.options?.map((opt, idx) => {
                const isCorrect = opt.id === previewQuestion.correctAnswer;
                return (
                  <div
                    key={opt.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isCorrect ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: isCorrect ? '#f0fdf4' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                    }}
                  >
                    <span>
                      <strong>{String.fromCharCode(65 + idx)}.</strong> {opt.text}
                    </span>
                    {isCorrect && (
                      <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '12px' }}>
                        ✓ Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {previewQuestion.explanation && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#475569' }}>
                <strong>Explanation:</strong> {previewQuestion.explanation}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setPreviewQuestion(null)} className="btn btn-secondary">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card modal-content" style={{ width: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Import Questions from JSON</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
              Paste a validated JSON array of questions. Each object must include <code>questionText</code>, <code>options</code> (with id and text), <code>correctAnswer</code>, and <code>skill</code>.
            </p>
            <textarea
              rows="10"
              className="form-control"
              placeholder={`[\n  {\n    "questionText": "What does JSX stand for in React?",\n    "skill": "React",\n    "difficulty": "Easy",\n    "options": [\n      { "id": "opt_1", "text": "JavaScript XML" },\n      { "id": "opt_2", "text": "JSON X-Path" }\n    ],\n    "correctAnswer": "opt_1"\n  }\n]`}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '12px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowImportModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleImportJson} className="btn btn-primary" disabled={!importJsonText.trim()}>
                Import Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default QuestionBank;
