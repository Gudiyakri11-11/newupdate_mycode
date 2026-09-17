import React from "react";
import { intermediateLinks } from "../../data/linksByLevel";
import {
  pageContainer,
  textPrimary,
  textSecondary,
  surface,
  hoverSurface,
} from "../../styles";

export default function LevelIntermediate() {
  return (
    <div className={pageContainer}>
      <h1 className={`text-2xl font-bold ${textPrimary}`}>
        Intermediate Level
      </h1>

      <p className={`mt-2 ${textSecondary}`}>
        Deepen your understanding with these resources.
      </p>

      <ul className="mt-6 space-y-3">
        {intermediateLinks.map((l, i) => (
          <li
            key={i}
            className={`${surface} ${hoverSurface} rounded-lg p-4 transition`}
          >
            <a
              className="text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 underline"
              href={l.href}
              target="_blank"
              rel="noreferrer"
            >
              {l.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
