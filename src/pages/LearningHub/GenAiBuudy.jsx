import React from "react";
import Card from "../../components/Card";
import LevelCard from "../../components/LearningHub/LevelCard";
import { navigate } from "../../router/miniRouter";
import { useApp } from "../../context/AppContext";

import {
  pageContainer,
  surface,
  textPrimary,
  textSecondary,
  sectionTitle,
  heroTitle,
  primaryButton,
} from "../../styles";

export default function Home() {
  const { isAuthenticated } = useApp()
  return (
    <div className={pageContainer}>
      {/* HERO */}
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className={`${heroTitle} ${textPrimary}`}>
            Master AI with Personalized Learning Paths
          </h1>

          <p className={`mt-4 max-w-prose leading-relaxed ${textSecondary}`}>
            Take our AI knowledge assessment and receive a customized learning
            journey tailored to your skill level.
          </p>

          <div className="mt-6">
            <button
              onClick={() => navigate("/genaibuddy/assessment")}
              className={primaryButton}
            >
              Get Started
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative">
          <img
            alt="AI brain"
            className="w-full rounded-2xl object-cover shadow-sm dark:shadow-black/30"
            src="https://images.unsplash.com/photo-1674027444485-cec3da58eef4?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          />

          {/* Soft ring that works in both themes */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5 dark:ring-white/10" />
        </div>
      </section>

      {/* WHY CHOOSE */}
      {isAuthenticated && (
            <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className={sectionTitle}>Why Choose GENAI Knowledge Path?</h2>
          {/* optional subtle divider card */}
          <div className={`hidden sm:block h-px flex-1 ${"bg-gray-200 dark:bg-gray-800"}`} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className={`rounded-xl ${surface} p-0 overflow-hidden`}>
            <Card
              title="AI-Powered Assessment"
              desc="Our intelligent quiz analyzes your responses to determine your skill level."
              onClick={() => navigate("/genaibuddy/assessment")}
              icon={
                <svg
                  className={`h-8 w-8 ${textPrimary}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 3v18M3 12h18" />
                </svg>
              }
            />
          </div>

          <div className={`rounded-xl ${surface} p-0 overflow-hidden`}>
            <Card
              title="Personalized Paths"
              desc="Get a tailored learning journey specifically for your goals."
              onClick={() => navigate("/genaibuddy/personalized")}
              icon={
                <svg
                  className={`h-8 w-8 ${textPrimary}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 6l7 6-7 6-7-6 7-6z" />
                </svg>
              }
            />
          </div>

          <div className={`rounded-xl ${surface} p-0 overflow-hidden`}>
            <Card
              title="Track Progress"
              desc="Monitor your completion with a simple, clear progress graph."
              onClick={() => navigate("/genaibuddy/progress")}
              icon={
                <svg
                  className={`h-8 w-8 ${textPrimary}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 15h2v3H7zM11 10h2v8h-2zM15 6h2v12h-2z" />
                </svg>
              }
            />
          </div>

          <div className={`rounded-xl ${surface} p-0 overflow-hidden`}>
            <Card
              title="Expert Content"
              desc="Explore curated content and vlogs from AI practitioners."
              onClick={() => navigate("/genaibuddy/expert")}
              icon={
                <svg
                  className={`h-8 w-8 ${textPrimary}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>
      )}

      {/* LEVELS */}
      <section className="mt-12">
        <h2 className={sectionTitle}>Learning Levels</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className={`rounded-xl ${surface} overflow-hidden`}>
            <LevelCard
              level="Beginner"
              desc="Start with the basics: terminology, Python, and first ML models."
              onClick={() => navigate("/genaibuddy/levels/beginner")}
            />
          </div>

          <div className={`rounded-xl ${surface} overflow-hidden`}>
            <LevelCard
              level="Intermediate"
              desc="Go deeper into feature engineering, model selection, and DL basics."
              onClick={() => navigate("/genaibuddy/levels/intermediate")}
            />
          </div>

          <div className={`rounded-xl ${surface} overflow-hidden`}>
            <LevelCard
              level="Expert"
              desc="Dive into Transformers, LLMs, RAG, and production-grade MLOps."
              onClick={() => navigate("/genaibuddy/levels/expert")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
