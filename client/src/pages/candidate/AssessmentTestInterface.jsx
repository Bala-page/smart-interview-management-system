import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  IconClock,
  IconShield,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconMaximize,
} from '../../components/Icons';

export const AssessmentTestInterface = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  // Test State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testData, setTestData] = useState(null); // { jobTitle, assessmentTitle, questions, expiresAt, ... }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedOptionId }
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);

  // Autosave Status
  const [saveStatus, setSaveStatus] = useState('Saved'); // 'Saved', 'Saving...', 'Error'
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Anti-Cheating & Violations
  const [violationCount, setViolationCount] = useState(0);
  const [warningModalText, setWarningModalText] = useState(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');

  // Manual Submission Confirmation Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Refs for intervals & debounce
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const isSubmittingRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const expiresAtRef = useRef(null);

  // 1. Initial Test Load & Server Synchronization
  useEffect(() => {
    initTest();
  }, [attemptId]);

  const initTest = async () => {
    try {
      setLoading(true);
      setError('');

      // Request fullscreen on user entry
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          // Browser may block automatic fullscreen until explicit gesture
        });
      }

      // Try starting or taking attempt
      let res;
      try {
        res = await api.startAssessment(attemptId);
      } catch (startErr) {
        // If already started, fetch take state
        res = await api.getAttemptForTaking(attemptId);
      }

      if (res.finalized || res.expired) {
        navigate(`/candidate/assessments/${attemptId}/result`, { replace: true });
        return;
      }

      if (res.success && res.data) {
        setTestData(res.data);
        expiresAtRef.current = new Date(res.data.expiresAt).getTime();
        setViolationCount(res.data.violationCount || 0);

        // Pre-fill existing answers
        const initialMap = {};
        (res.data.answers || []).forEach((a) => {
          if (a.questionId && a.selectedOptionId) {
            initialMap[a.questionId.toString()] = a.selectedOptionId;
          }
        });
        setAnswers(initialMap);

        // Calculate initial remaining seconds
        const msRemaining = expiresAtRef.current - Date.now();
        setRemainingSeconds(Math.max(0, Math.floor(msRemaining / 1000)));
      } else {
        throw new Error(res.message || 'Unable to initialize assessment');
      }
    } catch (err) {
      setError(err.message || 'Failed to start assessment');
    } finally {
      setLoading(false);
    }
  };

  // 2. Strict Authoritative 15-Minute Countdown Timer
  useEffect(() => {
    if (!expiresAtRef.current || isTerminated || submitting) return;

    const timerInterval = setInterval(() => {
      const msRemaining = expiresAtRef.current - Date.now();
      const secRemaining = Math.max(0, Math.floor(msRemaining / 1000));
      setRemainingSeconds(secRemaining);

      if (secRemaining <= 0) {
        clearInterval(timerInterval);
        handleTimeExpiredAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [testData, isTerminated, submitting]);

  // 3. Periodic 30-Second Automatic Answer Persistence
  useEffect(() => {
    if (isTerminated || submitting) return;

    const autosaveInterval = setInterval(() => {
      flushSaveAnswers();
    }, 30000);

    return () => clearInterval(autosaveInterval);
  }, [isTerminated, submitting]);

  // 4. Anti-Cheating: Fullscreen & Tab Switching Monitor (Max 3 Violations)
  useEffect(() => {
    if (isTerminated || submitting || loading) return;

    const recordViolationEvent = async (type, desc) => {
      // Deduplicate rapid consecutive events (< 2 seconds)
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 2000) return;
      lastViolationTimeRef.current = now;

      try {
        const res = await api.recordAssessmentViolation(attemptId, {
          eventType: type,
          description: desc,
        });

        if (res.terminated) {
          setIsTerminated(true);
          setTerminationReason('Maximum Tab Violations (3/3 strikes)');
          setWarningModalText(null);
        } else if (res.violationCount) {
          setViolationCount(res.violationCount);
          if (res.violationCount === 1) {
            setWarningModalText('Warning (Strike 1 of 3): Tab switch or window minimization detected! Navigating away from the assessment is prohibited.');
          } else if (res.violationCount === 2) {
            setWarningModalText('CRITICAL WARNING (Strike 2 of 3): Next violation will immediately terminate your assessment and auto-submit current answers!');
          }
        }
      } catch (err) {
        console.warn('Failed to report violation event:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolationEvent('visibilitychange', 'Candidate switched away from browser tab');
      }
    };

    const handleWindowBlur = () => {
      recordViolationEvent('blur', 'Candidate window lost focus');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolationEvent('fullscreen_exit', 'Candidate exited browser fullscreen mode');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [attemptId, isTerminated, submitting, loading]);

  // Save Answers to Server
  const flushSaveAnswers = async (currentAnswersMap = answersRef.current) => {
    if (isSubmittingRef.current || isTerminated) return;

    const formatted = Object.entries(currentAnswersMap).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }));

    if (formatted.length === 0) return;

    try {
      setSaveStatus('Saving...');
      const res = await api.saveAssessmentAnswers(attemptId, formatted);
      if (res.success) {
        setSaveStatus('Saved');
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      if (err.response?.expired) {
        handleTimeExpiredAutoSubmit();
      } else {
        setSaveStatus('Save Failed');
      }
    }
  };

  // Option Click Handler (updates local state + debounced server save)
  const handleSelectOption = (questionId, optionId) => {
    if (isTerminated || submitting) return;

    const updated = { ...answers, [questionId]: optionId };
    setAnswers(updated);

    // Save with debounce
    flushSaveAnswers(updated);
  };

  const handleClearSelection = (questionId) => {
    if (isTerminated || submitting) return;

    const updated = { ...answers, [questionId]: null };
    setAnswers(updated);
    flushSaveAnswers(updated);
  };

  // Submission Paths
  const handleTimeExpiredAutoSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      await api.submitAssessment(attemptId, {
        submissionReason: 'Time Expired',
        answers: Object.entries(answersRef.current).map(([qId, optId]) => ({
          questionId: qId,
          selectedOptionId: optId,
        })),
      });
    } catch (err) {
      console.warn('Auto submit request finished:', err.message);
    } finally {
      navigate(`/candidate/assessments/${attemptId}/result`, { replace: true });
    }
  };

  const handleManualSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      await api.submitAssessment(attemptId, {
        submissionReason: 'Manual Submission',
        answers: Object.entries(answersRef.current).map(([qId, optId]) => ({
          questionId: qId,
          selectedOptionId: optId,
        })),
      });
      navigate(`/candidate/assessments/${attemptId}/result`, { replace: true });
    } catch (err) {
      setError(err.message || 'Submission failed. Please retry.');
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Format time MM:SS
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Initializing Secure Assessment Environment...</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Synchronizing countdown timer & questions snapshot.</div>
        </div>
      </div>
    );
  }

  if (error && !testData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center', background: '#1e293b', padding: '32px', borderRadius: '12px' }}>
          <IconAlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Assessment Access Error</h2>
          <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
          <button onClick={() => navigate('/candidate/assessments')} className="btn btn-primary">
            Return to My Assessments
          </button>
        </div>
      </div>
    );
  }

  // If Terminated due to 3 violations
  if (isTerminated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '20px' }}>
        <div style={{ maxWidth: '520px', textAlign: 'center', background: '#1e293b', padding: '36px', borderRadius: '12px', border: '2px solid #ef4444' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <IconAlertTriangle size={36} style={{ color: '#ef4444' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f87171', margin: '0 0 10px 0' }}>
            Assessment Terminated
          </h2>
          <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            Your assessment was automatically terminated because the anti-cheating policy detected <strong>3 tab-switch or window blur violations</strong>.
            <br />
            Answers persisted up to the violation event have been finalized and submitted for recruiter evaluation.
          </p>
          <button
            onClick={() => navigate(`/candidate/assessments/${attemptId}/result`, { replace: true })}
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '600' }}
          >
            View Evaluation Result
          </button>
        </div>
      </div>
    );
  }

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentIndex] || {};
  const currentQId = (currentQuestion.questionId?._id || currentQuestion.questionId || '').toString();
  const selectedOptionForCurrent = answers[currentQId] || null;

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  const timerColor = remainingSeconds <= 60 ? '#ef4444' : remainingSeconds <= 180 ? '#f59e0b' : '#38bdf8';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Authoritative Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
            {testData?.jobTitle || 'Technical Assessment'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            SIMS Proctored Assessment • 10 Questions
          </div>
        </div>

        {/* 15-Minute Countdown Timer Display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#0f172a',
          padding: '8px 18px',
          borderRadius: '24px',
          border: `2px solid ${timerColor}`,
        }}>
          <IconClock size={18} style={{ color: timerColor }} />
          <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', color: timerColor, letterSpacing: '1px' }}>
            {formatTimer(remainingSeconds)}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Time Left</span>
        </div>

        {/* Anti-Cheating & Autosave Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Violation Counter */}
          <div style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: violationCount > 0 ? '#450a0a' : '#1e293b',
            color: violationCount > 0 ? '#f87171' : '#94a3b8',
            border: `1px solid ${violationCount > 0 ? '#dc2626' : '#334155'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <IconShield size={14} />
            <span>Strikes: <strong>{violationCount}/3</strong></span>
          </div>

          {/* Autosave Status */}
          <div style={{ fontSize: '12px', color: saveStatus === 'Saving...' ? '#fbbf24' : '#34d399' }}>
            {saveStatus === 'Saving...' ? 'Saving answers...' : `✓ ${saveStatus}`}
            {lastSavedTime && <span style={{ color: '#64748b', marginLeft: '4px' }}>({lastSavedTime})</span>}
          </div>
        </div>
      </header>

      {/* Main Examination Layout */}
      <main style={{ flex: 1, display: 'flex', flexWrap: 'wrap', maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px', gap: '24px' }}>
        {/* Left Side: Current Question & Options */}
        <div style={{ flex: '1 1 650px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
            {/* Question Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8' }}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span style={{ background: '#334155', color: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                  {currentQuestion.skill}
                </span>
                <span style={{ background: '#334155', color: '#cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  {currentQuestion.difficulty}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {currentQuestion.marks || 1} mark
              </span>
            </div>

            {/* Question Text */}
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              {currentQuestion.questionText}
            </h2>

            {/* 4 MCQ Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQuestion.options?.map((opt, optIdx) => {
                const isSelected = selectedOptionForCurrent === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQId, opt.id)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                      background: isSelected ? '#0369a1' : '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #ffffff' : '2px solid #64748b',
                      background: isSelected ? '#ffffff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: isSelected ? '#0369a1' : '#94a3b8',
                      flexShrink: 0,
                    }}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span style={{ fontSize: '15px', color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                      {opt.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Clear Selection */}
            {selectedOptionForCurrent && (
              <div style={{ marginTop: '14px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => handleClearSelection(currentQId)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
              disabled={currentIndex === 0}
              className="btn btn-secondary"
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              ← Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '14px', background: '#16a34a', borderColor: '#16a34a' }}
              >
                Review & Submit Test
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Question Navigation Palette */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Question Palette
            </h3>

            {/* 10 Numbered Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {questions.map((q, idx) => {
                const qId = (q.questionId?._id || q.questionId || '').toString();
                const isAnswered = Boolean(answers[qId]);
                const isCurrent = idx === currentIndex;

                let btnBg = '#0f172a';
                let btnColor = '#94a3b8';
                let btnBorder = '1px solid #334155';

                if (isAnswered) {
                  btnBg = '#16a34a';
                  btnColor = '#ffffff';
                  btnBorder = '1px solid #16a34a';
                }
                if (isCurrent) {
                  btnBorder = '2px solid #38bdf8';
                }

                return (
                  <button
                    key={qId}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      padding: '12px 0',
                      borderRadius: '8px',
                      background: btnBg,
                      color: btnColor,
                      border: btnBorder,
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Palette Legend */}
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#16a34a' }} />
                <span style={{ color: '#cbd5e1' }}>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0f172a', border: '1px solid #334155' }} />
                <span style={{ color: '#cbd5e1' }}>Unanswered ({unansweredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid #38bdf8' }} />
                <span style={{ color: '#cbd5e1' }}>Current Question</span>
              </div>
            </div>

            {/* Final Submit Action */}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '700', background: '#16a34a', borderColor: '#16a34a' }}
              >
                Submit Assessment
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Manual Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card modal-content" style={{ width: '480px', padding: '24px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 12px 0' }}>
              Confirm Assessment Submission
            </h2>
            <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px 0' }}>
                You have completed <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              </p>
              {unansweredCount > 0 ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', padding: '10px 14px', borderRadius: '6px', color: '#fbbf24', fontSize: '13px' }}>
                  ⚠️ You still have <strong>{unansweredCount} unanswered questions</strong>. Once submitted, you cannot modify your answers.
                </div>
              ) : (
                <div style={{ background: 'rgba(22, 163, 74, 0.15)', border: '1px solid #16a34a', padding: '10px 14px', borderRadius: '6px', color: '#4ade80', fontSize: '13px' }}>
                  ✓ All 10 questions have been answered.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                className="btn btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strike Warning Modal */}
      {warningModalText && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
        }}>
          <div className="card modal-content" style={{ width: '460px', padding: '24px', background: '#1e293b', border: '2px solid #ef4444', color: '#f8fafc', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <IconAlertTriangle size={28} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f87171', margin: '0 0 10px 0' }}>
              Proctoring Violation Warning
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {warningModalText}
            </p>
            <button
              onClick={() => {
                setWarningModalText(null);
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              I Understand — Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AssessmentTestInterface;
