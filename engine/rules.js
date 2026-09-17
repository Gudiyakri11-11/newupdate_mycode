/**
 * Deep Scan AI - Rule-based Categorization Rules
 * 
 * Each category has weighted keyword groups. Keywords closer to the top
 * of each group carry higher weight. The engine scores each incident/SR
 * description against all categories and assigns the highest-scoring one.
 */

export const CATEGORIES = {
  operational: {
    name: "Operational",
    description: "Issues related to operations, processes, workflows, SLA management, capacity, performance, availability, and monitoring",
    color: "#3B82F6",
    icon: "Settings",
    keywordGroups: [
      {
        name: "Process & Workflow",
        weight: 3,
        keywords: [
          "sla breach", "sla violation", "sla miss", "service level",
          "workflow failure", "workflow error", "process failure", "process breakdown",
          "escalation", "escalated", "priority escalation",
          "change management", "change request", "change failure",
          "incident management", "problem management",
          "capacity planning", "capacity issue", "resource exhaustion",
          "scheduling", "scheduled job", "cron job", "batch job", "batch failure",
          "job failed", "job timeout", "job stuck", "job hung",
        ]
      },
      {
        name: "Availability & Performance",
        weight: 3,
        keywords: [
          "outage", "downtime", "service down", "system down", "unavailable",
          "service unavailable", "service degradation", "degraded performance",
          "high latency", "slow response", "response time", "timeout",
          "cpu usage", "memory usage", "disk space", "disk full",
          "high cpu", "high memory", "memory leak", "out of memory",
          "load balancer", "failover", "redundancy",
        ]
      },
      {
        name: "Monitoring & Alerting",
        weight: 2,
        keywords: [
          "monitoring", "alert", "alerting", "alarm", "threshold",
          "health check", "heartbeat", "ping failure",
          "log monitoring", "event monitoring", "metric",
          "dashboard alert", "notification failure",
          "false positive", "alert fatigue", "alert storm",
        ]
      },
      {
        name: "Backup & Recovery",
        weight: 2,
        keywords: [
          "backup", "backup failure", "backup failed", "restore",
          "disaster recovery", "failback", "recovery point",
          "data recovery", "site recovery", "business continuity",
          "replication", "replication lag", "sync failure",
        ]
      },
      {
        name: "Operational Tasks",
        weight: 1,
        keywords: [
          "restart", "reboot", "recycle", "bounce",
          "maintenance window", "planned maintenance", "patching window",
          "housekeeping", "cleanup", "archival", "purge",
          "certificate renewal", "cert expiry", "certificate expired",
          "license renewal", "license expired",
          "password reset", "account unlock", "access provisioning",
        ]
      }
    ]
  },

  technical: {
    name: "Technical",
    description: "Issues related to technology, infrastructure, code defects, system errors, patches, upgrades, configurations, database, network, and security",
    color: "#EF4444",
    icon: "Code",
    keywordGroups: [
      {
        name: "Code & Application Defects",
        weight: 3,
        keywords: [
          "bug", "defect", "code error", "code fix", "hotfix", "hot fix",
          "null pointer", "null reference", "exception", "unhandled exception",
          "stack trace", "stacktrace", "error log", "fatal error",
          "crash", "crashed", "core dump", "segfault", "segmentation fault",
          "race condition", "deadlock", "infinite loop", "memory corruption",
          "regression", "broken build", "build failure", "compilation error",
        ]
      },
      {
        name: "Infrastructure & System",
        weight: 3,
        keywords: [
          "server error", "server crash", "server failure",
          "hardware failure", "disk failure", "raid failure",
          "os error", "kernel panic", "blue screen", "bsod",
          "driver issue", "firmware", "bios",
          "virtual machine", "vm error", "container crash", "pod crash",
          "kubernetes", "docker", "deployment failure", "deploy failed",
          "cloud infrastructure", "aws", "azure", "gcp",
        ]
      },
      {
        name: "Database",
        weight: 2,
        keywords: [
          "database error", "db error", "sql error", "query error",
          "database corruption", "data corruption", "index corruption",
          "connection pool", "connection timeout", "db connection",
          "deadlock", "table lock", "blocking query",
          "database migration", "schema change", "data migration",
          "stored procedure", "trigger error",
        ]
      },
      {
        name: "Network & Connectivity",
        weight: 2,
        keywords: [
          "network error", "network failure", "connectivity issue",
          "dns failure", "dns resolution", "name resolution",
          "firewall", "firewall rule", "port blocked",
          "ssl error", "tls error", "certificate error", "handshake failure",
          "vpn", "proxy error", "load balancer error",
          "packet loss", "network latency", "bandwidth",
        ]
      },
      {
        name: "Patches & Upgrades",
        weight: 2,
        keywords: [
          "patch", "security patch", "hotfix", "update",
          "upgrade", "version upgrade", "migration",
          "compatibility issue", "deprecated", "end of life", "eol",
          "dependency", "library update", "framework upgrade",
          "vulnerability", "cve", "security fix",
        ]
      },
      {
        name: "Configuration",
        weight: 1,
        keywords: [
          "misconfiguration", "config error", "configuration issue",
          "environment variable", "env variable", "settings error",
          "property file", "config file", "yml error", "yaml error",
          "permission denied", "access denied", "unauthorized",
          "wrong environment", "wrong config",
        ]
      }
    ]
  },

  functional: {
    name: "Functional",
    description: "Issues related to application functionality, features, business logic, user requirements, UI/UX, data accuracy, reports, and integrations",
    color: "#10B981",
    icon: "Layers",
    keywordGroups: [
      {
        name: "Business Logic & Features",
        weight: 3,
        keywords: [
          "business rule", "business logic", "logic error", "calculation error",
          "incorrect result", "wrong result", "wrong output", "wrong calculation",
          "feature request", "new feature", "enhancement", "improvement",
          "requirement", "specification", "acceptance criteria",
          "use case", "user story", "business process",
          "validation error", "validation rule", "data validation",
        ]
      },
      {
        name: "UI/UX Issues",
        weight: 2,
        keywords: [
          "ui issue", "ui bug", "user interface", "display issue",
          "layout broken", "alignment issue", "rendering issue",
          "usability", "user experience", "ux issue",
          "button not working", "link broken", "broken link",
          "page not loading", "screen freeze", "ui freeze",
          "responsive", "mobile issue", "browser compatibility",
          "accessibility", "screen reader",
        ]
      },
      {
        name: "Data & Reports",
        weight: 2,
        keywords: [
          "data issue", "data error", "data mismatch", "data discrepancy",
          "incorrect data", "wrong data", "missing data", "data loss",
          "report error", "report incorrect", "wrong report",
          "dashboard error", "chart error", "visualization error",
          "export error", "import error", "data import", "data export",
          "etl", "data pipeline", "data feed",
        ]
      },
      {
        name: "Integration",
        weight: 2,
        keywords: [
          "integration error", "integration failure", "api error",
          "api failure", "web service error", "soap error", "rest api",
          "third party", "vendor", "external system",
          "interface error", "interface failure", "middleware",
          "message queue", "queue error", "messaging error",
          "file transfer", "ftp error", "sftp error",
        ]
      },
      {
        name: "Workflow & Automation",
        weight: 1,
        keywords: [
          "approval workflow", "notification", "email notification",
          "automated process", "automation failure", "rule engine",
          "trigger", "event handler", "callback",
          "form submission", "form error", "input error",
        ]
      }
    ]
  },

  knowledge: {
    name: "Knowledge",
    description: "Issues related to documentation gaps, training needs, repeated/recurring issues, unclear processes, tribal knowledge, and user errors due to lack of knowledge",
    color: "#F59E0B",
    icon: "BookOpen",
    keywordGroups: [
      {
        name: "Documentation Gaps",
        weight: 3,
        keywords: [
          "documentation", "document missing", "no documentation",
          "undocumented", "not documented", "doc update",
          "runbook", "runbook missing", "playbook",
          "knowledge base", "kb article", "wiki",
          "sop", "standard operating procedure", "procedure missing",
          "readme", "guide", "manual",
        ]
      },
      {
        name: "Training & Skills",
        weight: 3,
        keywords: [
          "training", "training needed", "skill gap",
          "user training", "staff training", "team training",
          "onboarding", "new hire", "new joiner",
          "cross training", "knowledge transfer", "kt session",
          "certification", "skill development",
          "unfamiliar", "not trained", "lack of training",
        ]
      },
      {
        name: "Recurring Issues",
        weight: 2,
        keywords: [
          "recurring", "recurrent", "repeated", "happening again",
          "same issue", "same problem", "known issue", "known error",
          "workaround", "temporary fix", "band-aid",
          "root cause not found", "root cause unknown",
          "intermittent", "sporadic", "random occurrence",
          "chronic", "persistent issue",
        ]
      },
      {
        name: "Process Clarity",
        weight: 2,
        keywords: [
          "unclear process", "process not defined", "no process",
          "confusion", "confused", "not sure how",
          "how to", "how do i", "what is the process",
          "who is responsible", "ownership unclear", "no owner",
          "tribal knowledge", "single point of failure", "key person dependency",
          "handover", "transition",
        ]
      },
      {
        name: "User Errors",
        weight: 2,
        keywords: [
          "user error", "human error", "operator error",
          "incorrect usage", "misuse", "wrong procedure",
          "did not follow", "did not know", "unaware",
          "accidental", "accidentally", "by mistake",
          "fat finger", "typo", "wrong input",
          "not aware", "lack of awareness",
        ]
      }
    ]
  }
};