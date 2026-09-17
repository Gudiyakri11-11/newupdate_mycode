


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  Settings, Code, Layers, BookOpen, HelpCircle,
  TrendingUp, Clock, FileText, ChevronDown, ChevronUp,
  Download, Filter, Search
} from "lucide-react";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

const ICONS = {
  Settings: <Settings size={20} />,
  Code: <Code size={20} />,
  Layers: <Layers size={20} />,
  BookOpen: <BookOpen size={20} />,
  HelpCircle: <HelpCircle size={20} />,
};

const CATEGORY_COLORS = {
  Operational: "#3B82F6",
  Technical: "#EF4444",
  Functional: "#10B981",
  Knowledge: "#F59E0B",
  Uncategorized: "#6B7280",
};

const CATEGORY_BG = {
  Operational: "bg-blue-50 border-blue-200",
  Technical: "bg-red-50 border-red-200",
  Functional: "bg-emerald-50 border-emerald-200",
  Knowledge: "bg-amber-50 border-amber-200",
  Uncategorized: "bg-gray-50 border-gray-200",
};

const CATEGORY_BADGE = {
  Operational: "bg-blue-100 text-blue-800",
  Technical: "bg-red-100 text-red-800",
  Functional: "bg-emerald-100 text-emerald-800",
  Knowledge: "bg-amber-100 text-amber-800",
  Uncategorized: "bg-gray-100 text-gray-800",
};

export function Dashboard({ result }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 20;
  const { summary, categoryMeta, confidenceDistribution, records } = result;

  const filteredRecords = records.filter((r) => {
    const matchesCategory = !selectedCategory || r.category === selectedCategory;

    const matchesSearch =
      !searchTerm ||
      Object.values(r.originalData).some((v) =>
        String(v).toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.matchedKeywords.some((kw) =>
        kw.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const pieData = categoryMeta
    .filter((c) => c.count > 0)
    .map((c) => ({
      name: c.name,
      value: c.count,
      color: CATEGORY_COLORS[c.name] || "#6B7280",
    }));

  const exportCSV = () => {
    const headers = [
      ...result.columns,
      "Category",
      "Confidence",
      "Matched Keywords",
      "Reasoning",
    ];

    const csvRows = [headers.join(",")];

    for (const record of records) {
      const row = [
        ...result.columns.map((col) =>
          `"${String(record.originalData[col] || "").replace(/"/g, '""')}"`
        ),
        `"${record.category}"`,
        record.confidence,
        `"${record.matchedKeywords.join("; ")}"`,
        `"${record.reasoning.replace(/"/g, '""')}"`,
      ];

      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `deep-scan-analysis-${result.filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText size={20} className="text-blue-600" />}
          label="Total Records"
          value={summary.totalRecords.toLocaleString()}
          sub={result.filename}
        />

        <StatCard
          icon={<TrendingUp size={20} className="text-green-600" />}
          label="Categorized"
          value={`${summary.categorized}`}
          sub={`${Math.round(
            (summary.categorized / summary.totalRecords) * 100
          )}% coverage`}
        />

        <StatCard
          icon={<Settings size={20} className="text-purple-600" />}
          label="Avg Confidence"
          value={`${summary.averageConfidence}%`}
          sub="Across all categories"
        />

        <StatCard
          icon={<Clock size={20} className="text-orange-600" />}
          label="Processing Time"
          value={`${summary.processingTimeMs}ms`}
          sub="Rule engine execution"
        />
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categoryMeta
          .filter((c) => c.key !== "uncategorized")
          .map((cat) => (
            <button
              key={cat.key}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.name ? null : cat.name
                )
              }
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selectedCategory === cat.name
                  ? "ring-2 ring-offset-2 shadow-md"
                  : "hover:shadow-sm"
              } ${CATEGORY_BG[cat.name] || "bg-gray-50 border-gray-200"}`}
              style={
                selectedCategory === cat.name
                  ? { ["--tw-ring-color"]: CATEGORY_COLORS[cat.name] }
                  : undefined
              }
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: CATEGORY_COLORS[cat.name] + "20" }}
                >
                  <span style={{ color: CATEGORY_COLORS[cat.name] }}>
                    {ICONS[cat.icon] || <HelpCircle size={20} />}
                  </span>
                </div>

                <span
                  className="text-2xl font-bold"
                  style={{ color: CATEGORY_COLORS[cat.name] }}
                >
                  {cat.count}
                </span>
              </div>

              <p className="text-sm font-semibold text-gray-900">{cat.name}</p>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {cat.percentage}% of total
                </span>
                <span className="text-xs text-gray-500">
                  ~{cat.avgConfidence}% conf.
                </span>
              </div>

              <Progress
                value={cat.percentage}
                indicatorColor={CATEGORY_COLORS[cat.name]}
                className="mt-2"
              />
            </button>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Distribution</CardTitle>
            <CardDescription>Breakdown of categorized items</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={true}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Confidence Distribution</CardTitle>
            <CardDescription>How confident are the categorizations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={confidenceDistribution}>
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Vertical Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Comparison</CardTitle>
          <CardDescription>
            Total items per category with confidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={categoryMeta.filter((c) => c.key !== "uncategorized")}
              layout="vertical"
            >
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Count" fill="#6366F1" radius={[0, 4, 4, 0]} />
              <Bar
                dataKey="avgConfidence"
                name="Avg Confidence %"
                fill="#10B981"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Categorized Records</CardTitle>
              <CardDescription>
                {filteredRecords.length} of {records.length} records
                {selectedCategory && (
                  <span className="ml-1">
                    filtered by <strong>{selectedCategory}</strong>
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>

              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Filter size={14} />
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          <div className="relative mt-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search records, keywords, categories..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            {paginatedRecords.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                columns={result.columns}
                textFields={result.textFields}
                expanded={expandedRecord === record.id}
                onToggle={() =>
                  setExpandedRecord(
                    expandedRecord === record.id ? null : record.id
                  )
                }
              />
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No records match your filter.
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------- Helper Components ----------------------- */

function StatCard({ icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 truncate max-w-32">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecordRow({ record, columns, textFields, expanded, onToggle }) {
  const primaryText = textFields
    .map((f) => record.originalData[f])
    .filter(Boolean)
    .join(" ");

  const truncatedText =
    primaryText.length > 120 ? primaryText.slice(0, 120) + "..." : primaryText;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs text-gray-400 w-8 text-center flex-shrink-0">
          #{record.id}
        </span>

        <Badge
          className={`${
            CATEGORY_BADGE[record.category] ||
            "bg-gray-100 text-gray-800"
          } flex-shrink-0`}
        >
          {record.category}
        </Badge>

        <span className="text-sm text-gray-700 flex-1 truncate">
          {truncatedText || "(No text)"}
        </span>

        <span className="text-xs text-gray-500 flex-shrink-0 w-12 text-right">
          {record.confidence}%
        </span>

        {expanded ? (
          <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Reasoning
            </p>
            <p className="text-sm text-gray-700">{record.reasoning}</p>
          </div>

          {record.matchedKeywords.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Matched Keywords
              </p>
              <div className="flex flex-wrap gap-1">
                {record.matchedKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Category Scores
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(record.scores).map(([cat, score]) => (
                <div
                  key={cat}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                    cat === record.category
                      ? "bg-blue-50 font-semibold text-blue-800"
                      : "bg-white text-gray-600"
                  }`}
                >
                  <span>{cat}</span>
                  <span>{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Original Data
            </p>

            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1 max-h-48 overflow-y-auto">
              {columns.map((col) => (
                <div key={col} className="flex text-xs">
                  <span className="font-medium text-gray-500 w-40 flex-shrink-0 truncate">
                    {col}:
                  </span>
                  <span className="text-gray-700 break-words">
                    {String(record.originalData[col] || "-")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}