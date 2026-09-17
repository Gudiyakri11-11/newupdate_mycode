import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;


const CATEGORY_COLORS = {
  Operational: "bg-blue-100 text-blue-800",
  Technical: "bg-red-100 text-red-800",
  Functional: "bg-emerald-100 text-emerald-800",
  Knowledge: "bg-amber-100 text-amber-800",
  Uncategorized: "bg-gray-100 text-gray-800",
};

export function TextAnalyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/analyze/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      setResult(data);
    } catch {
      console.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-8 max-w-4xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-600" />
          Quick Text Analyzer
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an incident or service request description here to quickly categorize it..."
            className="flex-1 min-h-20 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <button
            onClick={analyzeText}
            disabled={!text.trim() || loading}
            className="self-end px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Badge
                className={
                  CATEGORY_COLORS[result.category] ||
                  "bg-gray-100 text-gray-800"
                }
              >
                {result.category}
              </Badge>

              <span className="text-sm text-gray-600">
                Confidence:{" "}
                <span className="font-semibold">{result.confidence}%</span>
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-2">{result.reasoning}</p>

            {result.matchedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.matchedKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
