import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import api from "../../Api";
const api_url = import.meta.env.VITE_API_URL;

export default function OnboardingEmployee() {
  const { user } = useApp();
  const [onboardingData, setOnboardingData] = useState(null);
  const [quiz, setQuiz] = useState(null); // Managed via fetch now
  const [loading, setLoading] = useState(true);

  // Quiz State
  const [activeQuizMilestone, setActiveQuizMilestone] = useState(null); // null means dashboard view
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { 0: 1, 1: 3, ... }
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch the user's dashboard data AND the Quiz JSON in parallel
  // 1. Fetch the user's dashboard data AND the Quiz JSON in parallel securely
  const fetchData = async () => {
    if (!user?.employeeId) return;
    try {
      // 🔒 Swapped native fetch calls for your centralized secure instance
      // Removed client-side employeeId injection; handled securely via server-side cookies
      const [dashRes, quizRes] = await Promise.all([
        api.get("/api/onboard/getEmployeeDashboard"),
        fetch("/OnboardingQuiz.json"), // Kept as standard fetch since this reads a public asset file
      ]);

      // Process Dashboard Data
      if (dashRes.data && dashRes.data.success) {
        setOnboardingData(dashRes.data.payload);
      }

      // Process Quiz JSON Data
      if (quizRes.ok) {
        const quizJson = await quizRes.json();
        setQuiz(quizJson);
      } else {
        console.error("Failed to load Quiz JSON. Check IIS MIME types.");
      }
    } catch (error) {
      console.error("Error fetching secure metrics data path:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.employeeId]);

  // ==========================================
  // QUIZ HANDLERS
  // ==========================================

  const startQuiz = (milestoneNumber) => {
    if (!quiz || !quiz[milestoneNumber]) {
      alert("Quiz data not available. Please ensure the JSON file is loaded.");
      return;
    }
    setActiveQuizMilestone(milestoneNumber);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
  };

  const handleOptionChange = (questionIndex, optionIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz[activeQuizMilestone].length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const submitQuiz = async () => {
    const questions = quiz[activeQuizMilestone];

    // Check if all questions are answered
    if (Object.keys(userAnswers).length < questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setIsSubmitting(true);

    // Calculate Score (4 questions = 25% each)
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);

    try {
      // 🔒 Forwarded via explicit structural Axios methods to prevent profile spoofing
      const response = await api.post("/api/onboard/submitQuiz", {
        milestoneNumber: activeQuizMilestone,
        score: finalScore,
      });

      if (response.data && response.data.success) {
        alert(
          `Quiz completed! You scored ${finalScore}%. \n${finalScore >= 70 ? "You passed!" : "You did not pass. Try again."}`,
        );
        setActiveQuizMilestone(null); // Return to dashboard
        fetchData(); // Refresh dashboard data securely to unlock next milestone if passed
      } else {
        alert("Failed to submit quiz to the server.");
      }
    } catch (error) {
      console.error("Quiz submission execution error context:", error);
      alert(
        "An error occurred during submission. Attempt could not be synced.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // CONDITIONAL RENDER: QUIZ UI
  // ==========================================

  if (activeQuizMilestone !== null) {
    const questions = quiz[activeQuizMilestone];
    const currentQ = questions[currentQuestionIndex];

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-10 px-4 transition-colors duration-300">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 relative overflow-hidden group">
          {/* Progress Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-blue-700 dark:text-cyan-400">
                Milestone {activeQuizMilestone}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Knowledge Assessment
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-blue-600 dark:text-cyan-500 block">
                {Math.round(
                  ((currentQuestionIndex + 1) / questions.length) * 100,
                )}
                % Complete
              </span>
              <span className="text-xs text-gray-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
          </div>

          {/* Question Area */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 leading-relaxed">
              {currentQ.question}
            </h3>
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = userAnswers[currentQuestionIndex] === idx;
                return (
                  <label
                    key={idx}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 
                    ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:border-cyan-500 dark:bg-cyan-950/30"
                        : "border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-cyan-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 
                    ${isSelected ? "border-blue-500 dark:border-cyan-500" : "border-gray-300 dark:border-gray-600"}`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-cyan-500 rounded-full" />
                      )}
                    </div>
                    <input
                      type="radio"
                      className="hidden"
                      checked={isSelected}
                      onChange={() =>
                        handleOptionChange(currentQuestionIndex, idx)
                      }
                    />
                    <span
                      className={`font-medium ${isSelected ? "text-blue-900 dark:text-cyan-100" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2.5 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
            >
              Back
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={submitQuiz}
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all transform active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Syncing..." : "Finish Quiz"}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all transform active:scale-95"
              >
                Next Question
              </button>
            )}
          </div>

          <button
            onClick={() => setActiveQuizMilestone(null)}
            className="mt-8 w-full text-sm text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Abandon Attempt & Return
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD UI (Main Screen)
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent dark:border-cyan-500 dark:border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-cyan-500 font-medium animate-pulse">
          Initializing Dashboard...
        </p>
      </div>
    );
  }

  if (!onboardingData || !onboardingData.isMapped) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="tech-bracket max-w-lg bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-xl text-center border border-gray-100 dark:border-gray-800">
          <div className="mb-6 inline-block p-4 bg-blue-50 dark:bg-cyan-950/30 rounded-full">
            <svg
              className="w-12 h-12 text-blue-600 dark:text-cyan-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Awaiting Assignment
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Welcome! Your personalized learning path is being prepared. Please
            contact your supervisor to assign your courses.
          </p>
        </div>
      </div>
    );
  }

  const milestones = [
    {
      id: 1,
      name: onboardingData.milestone1Name,
      score: onboardingData.milestone1Score,
      status: onboardingData.milestone1Status,
      attempts: onboardingData.milestone1Attempts,
      link: onboardingData.milestone1Link,
      passed: onboardingData.milestone1Score >= 70,
      locked: false,
    },
    {
      id: 2,
      name: onboardingData.milestone2Name,
      score: onboardingData.milestone2Score,
      status: onboardingData.milestone2Status,
      attempts: onboardingData.milestone2Attempts,
      link: onboardingData.milestone2Link,
      passed: onboardingData.milestone2Score >= 70,
      locked: onboardingData.milestone1Score < 70,
    },
    {
      id: 3,
      name: onboardingData.milestone3Name,
      score: onboardingData.milestone3Score,
      status: onboardingData.milestone3Status,
      attempts: onboardingData.milestone3Attempts,
      link: onboardingData.milestone3Link,
      passed: onboardingData.milestone3Score >= 70,
      locked: onboardingData.milestone2Score < 70,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none opacity-50 dark:opacity-100"></div>

      <div className="max-w-6xl mx-auto pt-16 px-6 pb-20 relative z-10">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Learning{" "}
            <span className="text-blue-600 dark:text-cyan-500">Journey</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Track your progress and unlock new skills.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={`relative group bg-white dark:bg-gray-900 p-6 rounded-2xl border transition-all duration-300 flex flex-col
              ${
                m.locked
                  ? "opacity-60 grayscale-[0.5] border-gray-200 dark:border-gray-800"
                  : "shadow-lg hover:shadow-2xl border-transparent dark:border-gray-800 hover:border-blue-500 dark:hover:border-cyan-500 transform hover:-translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full 
                ${m.locked ? "bg-gray-100 text-gray-400 dark:bg-gray-800" : "bg-blue-100 text-blue-600 dark:bg-cyan-950 dark:text-cyan-400"}`}
                >
                  M-0{m.id}
                </span>
                {m.passed && (
                  <span className="flex items-center text-green-500 dark:text-emerald-400 text-xs font-bold">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    PASSED
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 line-clamp-2 min-h-[3.5rem]">
                {m.name || "Pending..."}
              </h2>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Current Score:
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {m.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${m.passed ? "bg-green-500" : "bg-blue-500 dark:bg-cyan-500"}`}
                    style={{ width: `${m.score}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                  Attempts: {m.attempts}
                </p>
              </div>

              <div className="mt-auto space-y-3">
                {m.locked ? (
                  <div className="py-3 text-center text-sm font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl cursor-not-allowed">
                    Locked 🔒
                  </div>
                ) : (
                  <>
                    <a
                      href={m.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center text-sm font-bold py-3 rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-cyan-500 dark:text-cyan-400 dark:hover:bg-cyan-950 transition-colors"
                    >
                      Study Materials
                    </a>
                    <button
                      onClick={() => startQuiz(m.id)}
                      className="w-full py-3 bg-blue-600 dark:bg-cyan-600 hover:bg-blue-700 dark:hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all transform active:scale-95"
                    >
                      Start Quiz {m.id}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
