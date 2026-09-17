-- 1. Bots
CREATE TABLE [dbo].[Bots] (
    [BotId] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [EmployeeId] VARCHAR(10) NOT NULL,
    [SubmittedBy] NVARCHAR(150) NULL,
    [Name] NVARCHAR(400) NOT NULL,
    [ProjectName] NVARCHAR(400) NULL,
    [ProjectId] NVARCHAR(200) NULL,
    [Description] NVARCHAR(MAX) NOT NULL,
    [UseCase] NVARCHAR(1000) NOT NULL,
    [Category] NVARCHAR(200) NULL,
    [Capabilities] NVARCHAR(MAX) NULL,
    [DemoLink] NVARCHAR(1000) NULL,
    [Owner] NVARCHAR(300) NULL,
    [Status] NVARCHAR(40) NOT NULL,
    [DeclineReason] NVARCHAR(MAX) NULL,
    [ReworkReason] NVARCHAR(MAX) NULL,
    [UsersCount] INT NULL,
    [Rating] FLOAT NULL,
    [CreatedAt] DATETIME2 NULL,
    [LastUpdated] DATETIME2 NULL,
    [Contributors] NVARCHAR(MAX) NULL
);
GO

-- 2. EmployeeMapping
CREATE TABLE [dbo].[EmployeeMapping] (
    [MappingId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [ManagerEmployeeId] VARCHAR(10) NOT NULL,
    [EmployeeId] VARCHAR(10) NOT NULL,
    [Milestone1Name] VARCHAR(255) NULL,
    [Milestone1Link] VARCHAR(500) NULL,
    [Milestone2Name] VARCHAR(255) NULL,
    [Milestone2Link] VARCHAR(500) NULL,
    [Milestone3Name] VARCHAR(255) NULL,
    [Milestone3Link] VARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL,
    [LastUpdated] DATETIME2 NOT NULL
);
GO

-- 3. EmployeeMilestones
CREATE TABLE [dbo].[EmployeeMilestones] (
    [EmployeeId] VARCHAR(10) NOT NULL PRIMARY KEY,
    [TechStack] VARCHAR(50) NOT NULL,
    [Location] VARCHAR(50) NOT NULL,
    [Milestone1Status] VARCHAR(20) NOT NULL,
    [Milestone2Status] VARCHAR(20) NOT NULL,
    [Milestone3Status] VARCHAR(20) NOT NULL,
    [Milestone1Attempts] INT NOT NULL,
    [Milestone2Attempts] INT NOT NULL,
    [Milestone3Attempts] INT NOT NULL,
    [Milestone1Score] INT NOT NULL,
    [Milestone2Score] INT NOT NULL,
    [Milestone3Score] INT NOT NULL,
    [LastUpdated] DATETIME2 NOT NULL
);
GO

-- 4. Gauge
CREATE TABLE [dbo].[Gauge] (
    [gauge_id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [start_time] DATETIME NULL,
    [email] VARCHAR(100) NULL,
    [name] VARCHAR(100) NULL,
    [employee_id] VARCHAR(10) NOT NULL,
    [date] DATE NULL,
    [is_on_leave] VARCHAR(10) NULL,
    [stage] VARCHAR(100) NULL,
    [business_requirements_activity] VARCHAR(200) NULL,
    [code_build_activity] VARCHAR(200) NULL,
    [design_activity] VARCHAR(200) NULL,
    [test_review_activity] VARCHAR(200) NULL,
    [deploy_hypercare_activity] VARCHAR(200) NULL,
    [domain_usecase_activity] VARCHAR(200) NULL,
    [other_activity] VARCHAR(200) NULL,
    [has_ghcp_license] VARCHAR(10) NULL,
    [using_genai_tools] VARCHAR(10) NULL,
    [which_genai_tool] VARCHAR(100) NULL,
    [items_with_genai_tools] FLOAT NULL,
    [hours_with_genai_tools] FLOAT NULL,
    [items_without_genai_tools] FLOAT NULL,
    [hours_without_genai_tools] FLOAT NULL
);
GO

-- 5. GenAI_Productivity_Index
CREATE TABLE [dbo].[GenAI_Productivity_Index] (
    [GPI_ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Employee_ID] NVARCHAR(50) NOT NULL,
    [Start_Date] DATE NOT NULL,
    [End_Date] DATE NOT NULL,
    [Squad_Name] NVARCHAR(200) NOT NULL,
    [Sprint_Name] NVARCHAR(300) NOT NULL,
    [Committed_Story_Points_Without_GenAI] FLOAT NOT NULL,
    [Actual_Delivered_Story_Points_With_GenAI] FLOAT NOT NULL,
    [Created_At] DATETIME2 NOT NULL,
    [Created_By] NVARCHAR(200) NULL,
    [Last_Updated_At] DATETIME2 NULL,
    [Last_Updated_By] NVARCHAR(200) NULL
);
GO
ALTER TABLE [dbo].[GenAI_Productivity_Index]
ADD [Note] NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('dbo.GenAI_Productivity_Index', 'Exclusion_Story_Points') IS NULL
BEGIN
    ALTER TABLE [dbo].[GenAI_Productivity_Index]
    ADD [Exclusion_Story_Points] INT NULL;
END
GO
IF COL_LENGTH('dbo.GenAI_Productivity_Index', 'Exclusion_Reason') IS NULL
BEGIN
    ALTER TABLE [dbo].[GenAI_Productivity_Index]
    ADD [Exclusion_Reason] NVARCHAR(MAX) NULL;
END
GO
IF COL_LENGTH('dbo.GenAI_Productivity_Index', 'Exclusion_Other_Reason') IS NULL
BEGIN
    ALTER TABLE [dbo].[GenAI_Productivity_Index]
    ADD [Exclusion_Other_Reason] NVARCHAR(300) NULL;
END
GO
ALTER TABLE [dbo].[GenAI_Productivity_Index]
ALTER COLUMN [Exclusion_Reason] NVARCHAR(MAX) NULL;
GO

-- 6. GenAIUseCases
CREATE TABLE [dbo].[GenAIUseCases] (
    [UseCaseId] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [EmployeeId] VARCHAR(10) NOT NULL,
    [SubmittedBy] NVARCHAR(150) NULL,
    [SubmissionDate] DATE NULL,
    [ProjectName] NVARCHAR(400) NULL,
    [ProjectId] NVARCHAR(200) NULL,
    [Title] NVARCHAR(600) NOT NULL,
    [Category] NVARCHAR(200) NULL,
    [Domain] NVARCHAR(300) NULL,
    [Client] NVARCHAR(300) NULL,
    [Team] NVARCHAR(300) NULL,
    [ProblemDescription] NVARCHAR(MAX) NOT NULL,
    [PainPoints] NVARCHAR(MAX) NULL,
    [ProcessImpacted] NVARCHAR(600) NULL,
    [SolutionDescription] NVARCHAR(MAX) NOT NULL,
    [GenAITypes] NVARCHAR(400) NULL,
    [RequirementsHelp] NVARCHAR(MAX) NULL,
    [DesignHelp] NVARCHAR(MAX) NULL,
    [DevelopmentHelp] NVARCHAR(MAX) NULL,
    [TestingHelp] NVARCHAR(MAX) NULL,
    [SupportHelp] NVARCHAR(MAX) NULL,
    [Platforms] NVARCHAR(400) NULL,
    [Models] NVARCHAR(400) NULL,
    [IntegrationPoints] NVARCHAR(600) NULL,
    [Benefits] NVARCHAR(MAX) NULL,
    [BeforeProcess] NVARCHAR(MAX) NULL,
    [AfterProcess] NVARCHAR(MAX) NULL,
    [AccuracyImprovement] NVARCHAR(400) NULL,
    [ScalabilityImprovement] NVARCHAR(400) NULL,
    [Reusable] NVARCHAR(20) NULL,
    [ScalabilityPotential] NVARCHAR(40) NULL,
    [FutureEnhancements] NVARCHAR(MAX) NULL,
    [DemoLink] NVARCHAR(1000) NULL,
    [DocLink] NVARCHAR(1000) NULL,
    [RepoLink] NVARCHAR(1000) NULL,
    [Status] NVARCHAR(40) NOT NULL,
    [DeclineReason] NVARCHAR(MAX) NULL,
    [ReworkReason] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NULL,
    [LastUpdated] DATETIME2 NULL,
    [Contributors] NVARCHAR(MAX) NULL
);
GO

-- 7. MilestoneCatalog
CREATE TABLE [dbo].[MilestoneCatalog] (
    [CourseId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MilestoneNumber] INT NOT NULL,
    [CourseLabel] VARCHAR(255) NOT NULL,
    [CourseLink] VARCHAR(500) NOT NULL,
    [IsActive] BIT NULL
);
GO

-- 8. MIPProject
CREATE TABLE [dbo].[MIPProject] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [ProjectId] NVARCHAR(200) NOT NULL,
    [ProjectName] NVARCHAR(510) NOT NULL,
    [ProjectManager] NVARCHAR(510) NOT NULL,
    [CreatedAt] DATETIME2 NULL
);
GO

-- 9. NeuroITUseCases
CREATE TABLE [dbo].[NeuroITUseCases] (
    [NeuroITId] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [EmployeeId] VARCHAR(10) NOT NULL,
    [SubmittedBy] NVARCHAR(150) NULL,
    [Title] NVARCHAR(600) NOT NULL,
    [ProjectName] NVARCHAR(400) NULL,
    [ProjectId] NVARCHAR(200) NULL,
    [Account] NVARCHAR(300) NULL,
    [ApplicationsImpacted] NVARCHAR(600) NULL,
    [Categories] NVARCHAR(400) NULL,
    [StatusType] NVARCHAR(100) NULL,
    [ProblemDescription] NVARCHAR(MAX) NULL,
    [OperationalImpact] NVARCHAR(MAX) NULL,
    [NeuroITCapability] NVARCHAR(400) NULL,
    [ToolsUsed] NVARCHAR(600) NULL,
    [SolutionDescription] NVARCHAR(MAX) NULL,
    [AutomationType] NVARCHAR(40) NULL,
    [Benefits] NVARCHAR(MAX) NULL,
    [Metrics] NVARCHAR(MAX) NULL,
    [Reusable] NVARCHAR(20) NULL,
    [ScalePotential] NVARCHAR(40) NULL,
    [ExecutiveOutcome] NVARCHAR(MAX) NOT NULL,
    [DocumentLink] NVARCHAR(MAX) NULL,
    [Status] NVARCHAR(40) NOT NULL,
    [DeclineReason] NVARCHAR(MAX) NULL,
    [ReworkReason] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NULL,
    [LastUpdated] DATETIME2 NULL,
    [Contributors] NVARCHAR(MAX) NULL
);
GO

-- 10. OptimizationTracker
CREATE TABLE [dbo].[OptimizationTracker] (
    [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    [ProjectId] NVARCHAR(200) NOT NULL,
    [Project] NVARCHAR(400) NOT NULL,
    [AssociateId] NVARCHAR(100) NOT NULL,
    [AssociateName] NVARCHAR(400) NOT NULL,
    [MipPlanDate] DATE NULL,
    [ExecutionDate] DATE NULL,
    [Action] NVARCHAR(1000) NULL,
    [PresentGrade] NVARCHAR(100) NULL,
    [ReplacementGrade] NVARCHAR(100) NULL,
    [UpdatedStatus] NVARCHAR(200) NULL,
    [RowEntryDate] DATETIME2 NOT NULL,
    [RowModifiedDate] DATETIME2 NOT NULL,
    [InternalTracking] NVARCHAR(1000) NULL,
    [OptimizationCategory] NVARCHAR(200) NULL,
    [Lever] NVARCHAR(1000) NULL
);
GO

-- 11. PanelNominationHistory
CREATE TABLE [dbo].[PanelNominationHistory] (
    [HistoryId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [NominationId] INT NOT NULL,
    [employee_id] VARCHAR(10) NOT NULL,
    [ActionType] VARCHAR(20) NOT NULL,
    [OldSlots] VARCHAR(MAX) NULL,
    [NewSlots] VARCHAR(MAX) NULL,
    [ModifiedAt] DATETIME NULL
);
GO

-- 12. PanelNominations
CREATE TABLE [dbo].[PanelNominations] (
    [NominationId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [employee_id] VARCHAR(10) NOT NULL,
    [name] VARCHAR(100) NOT NULL,
    [grade] VARCHAR(10) NOT NULL,
    [location] VARCHAR(100) NOT NULL,
    [parent_customer] VARCHAR(150) NOT NULL,
    [contact_no] VARCHAR(20) NOT NULL,
    [interview_skills] VARCHAR(MAX) NOT NULL,
    [booked_slots] VARCHAR(MAX) NOT NULL,
    [created_at] DATETIME NULL
);
GO

-- 13. projects
CREATE TABLE [dbo].[projects] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [project_id] VARCHAR(100) NOT NULL,
    [project_name] VARCHAR(255) NOT NULL,
    [project_manager] VARCHAR(255) NOT NULL,
    [manager_id] VARCHAR(100) NOT NULL,
    [proxy_manager_name] VARCHAR(255) NULL,
    [proxy_manager_id] VARCHAR(100) NULL,
    [created_at] DATETIME NULL
);
GO

-- 14. Task_Notes (NEW)
CREATE TABLE [dbo].[Task_Notes] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [task_id] INT NOT NULL,
    [note_text] NVARCHAR(MAX) NOT NULL,
    [author] VARCHAR(10) NOT NULL,
    [created_at] DATETIME2 NULL
);
GO

-- 15. Tasks (NEW)
CREATE TABLE [dbo].[Tasks] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [title] NVARCHAR(510) NOT NULL,
    [task_details] NVARCHAR(MAX) NULL,
    [assignee] VARCHAR(10) NULL,
    [section] NVARCHAR(100) NULL,
    [status] NVARCHAR(100) NULL,
    [created_at] DATETIME2 NULL,
    [created_by] VARCHAR(10) NOT NULL,
    [in_progress_date] DATETIME2 NULL,
    [in_progress_by] VARCHAR(10) NULL,
    [end_date] DATETIME2 NULL,
    [completed_by] VARCHAR(10) NULL,
    [accepted_date] DATETIME2 NULL,
    [accepted_by] VARCHAR(10) NULL
);
GO

-- 16. Users (UPDATED with Security Columns)
CREATE TABLE [dbo].[Users] (
    [employee_id] VARCHAR(10) NOT NULL PRIMARY KEY,
    [name] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100) NOT NULL,
    [password_hash] VARCHAR(200) NOT NULL,
    [role] VARCHAR(20) NOT NULL,
    [is_active] BIT NOT NULL DEFAULT 1,
    [failed_login_attempts] INT NOT NULL DEFAULT 0,
    [account_locked_until] DATETIME2 NULL,
    [reset_token_hash] VARCHAR(200) NULL,
    [reset_token_expires_at] DATETIME2 NULL,
    [last_login_at] DATETIME2 NULL,
    [last_logout_at] DATETIME2 NULL,
    [last_login_ip] VARCHAR(45) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO


-- 13. ReservedSlots
CREATE TABLE [dbo].[ReservedSlots] (
    [ReservationId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [NominationId] INT NOT NULL,
    [employee_id] VARCHAR(10) NOT NULL, -- The Panelist/Interviewer
    [date] VARCHAR(20) NOT NULL,
    [time] VARCHAR(30) NOT NULL,
    [reserved_by_id] VARCHAR(10) NOT NULL, -- The SA/Admin who booked it
    [reserved_by_name] VARCHAR(100) NOT NULL,
    [reserved_at] DATETIME DEFAULT GETDATE(),
    -- Prevent double booking the exact same slot for the same user
    CONSTRAINT UQ_ReservedSlot UNIQUE (NominationId, date, time) 
);
GO

ALTER TABLE [dbo].[ReservedSlots]
ADD [tagged_candidates] VARCHAR(MAX) NULL;
GO

ALTER TABLE [dbo].[ReservedSlots] 
ADD [mode] VARCHAR(50) NULL;

ALTER TABLE [dbo].[Tasks]
ALTER COLUMN [assignee] VARCHAR(MAX) NULL;
GO

CREATE TABLE AssociateDetails (
    AssociateID INT PRIMARY KEY,
    AssociateName VARCHAR(100) NOT NULL,
    SupervisorID INT,
    SupervisorName VARCHAR(100),
    Grade VARCHAR(50),
    Vertical VARCHAR(100),
    Location VARCHAR(100),
    ProjectID VARCHAR(50),
    ProjectName VARCHAR(150),
    AccountName VARCHAR(150)
);

ALTER TABLE AssociateDetails 
ADD Department VARCHAR(150) NULL;

ALTER TABLE AssociateDetails 
ADD AccountName VARCHAR(150) NULL;


CREATE TABLE [dbo].[projects] (
    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [project_id] VARCHAR(100) NOT NULL,
    [project_name] VARCHAR(255) NOT NULL,
    [project_manager] VARCHAR(255) NOT NULL,
    [manager_id] VARCHAR(100) NOT NULL,
    [proxy_manager_name] VARCHAR(255) NULL,
    [proxy_manager_id] VARCHAR(100) NULL,
    [created_at] DATETIME NULL
);
GO


-- Step 1: Drop the old constraint that is blocking 'guides'
ALTER TABLE [dbo].[Users]
DROP CONSTRAINT [CK__Users__role__38996AB5];
GO

-- Step 2: Create a new constraint that includes all four valid roles
ALTER TABLE [dbo].[Users]
ADD CONSTRAINT [CK_Users_Role] 
CHECK ([role] IN ('user', 'guides', 'moderator', 'admin'));
GO


 alter table gauge
 alter column items_with_genai_tools float null;
 
 alter table gauge
 alter column items_without_genai_tools float null;


CREATE TABLE [dbo].[ClientProjectMapping] (
    [Project_ID] VARCHAR(100) NOT NULL PRIMARY KEY,
    [Project_Name] VARCHAR(255) NULL,
    [Account_ID] VARCHAR(100) NULL,
    [Account_Name] VARCHAR(150) NULL,
    [Parent_Customer_ID] VARCHAR(100) NULL,
    [Parent_Customer_Name] VARCHAR(150) NULL,
    [Last_Updated] DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO