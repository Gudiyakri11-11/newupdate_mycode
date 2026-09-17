import express from "express";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce secure JWT session parsing on all underlying routes
router.use(authenticateToken);

// Secure Role Guard
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.realRole !== 'admin' && req.user.realRole !== 'moderator' && req.user.realRole !== 'ADMIN')) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};

// 🟣 GET: Fetch all active users from the database for accurate name resolution
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT employee_id, name 
      FROM Users 
      WHERE is_active = 1
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching users directory:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// 🟢 GET: Fetch all items
router.get("/items", requireAdmin, async (req, res) => {
  try {
    const pool = await getDbConnection();
    const tasksResult = await pool.request().query("SELECT * FROM Tasks");
    const notesResult = await pool.request().query("SELECT * FROM Task_Notes");
    
    const tasks = tasksResult.recordset;
    const allNotes = notesResult.recordset;

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      task_details: task.task_details,
      assignee: task.assignee,
      section: task.section,
      status: task.status,
      endDate: task.end_date,
      completedBy: task.completed_by,
      createdAt: task.created_at,
      createdBy: task.created_by,
      acceptedDate: task.accepted_date,
      acceptedBy: task.accepted_by,
      inProgressDate: task.in_progress_date,
      inProgressBy: task.in_progress_by,
      notes: allNotes.filter(note => note.task_id === task.id).map(n => ({
        id: n.id,
        text: n.note_text,
        author: n.author,
        timestamp: n.created_at
      }))
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

// 🔵 POST: Create a new task
router.post("/items", requireAdmin, async (req, res) => {
  const { title, task_details, assignee, section } = req.body;

  if (!title) return res.status(400).json({ error: "Task Name is required" });

  const createdBy = req.user.employeeId;

  try {
    const pool = await getDbConnection();
    
    const result = await pool.request()
      .input('title', sql.NVarChar(510), title)                
      .input('task_details', sql.NVarChar(sql.MAX), task_details || null)
      .input('assignee', sql.VarChar(sql.MAX), assignee || null)    // ✅ Expanded to MAX
      .input('section', sql.NVarChar(100), section || "pipeline")
      .input('created_by', sql.VarChar(10), createdBy)        
      .query(`
        INSERT INTO Tasks (title, task_details, assignee, section, created_by, created_at)
        OUTPUT INSERTED.* VALUES (@title, @task_details, @assignee, @section, @created_by, SYSDATETIME())
      `);
      
    const newTask = result.recordset[0];
    newTask.notes = [];
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task." });
  }
});

// 🟠 PUT: Update status, add note, or full EDIT
router.put("/items/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });

  const { status, section, newNote, editData } = req.body;
  const actionUser = req.user.employeeId;

  try {
    const pool = await getDbConnection();

    if (editData) {
      await pool.request()
        .input('id', sql.Int, id)
        .input('title', sql.NVarChar(510), editData.title)            
        .input('task_details', sql.NVarChar(sql.MAX), editData.details || null)
        .input('assignee', sql.VarChar(sql.MAX), editData.assignee || null) // ✅ Expanded to MAX
        .query(`
          UPDATE Tasks
          SET title = @title, task_details = @task_details, assignee = @assignee
          WHERE id = @id
        `);
    }

    if (status || section) {
      await pool.request()
        .input('id', sql.Int, id)
        .input('status', sql.NVarChar(100), status || null)  
        .input('section', sql.NVarChar(100), section || null)
        .input('action_user', sql.VarChar(10), actionUser)  
        .query(`
          UPDATE Tasks
          SET
            status = COALESCE(@status, status),
            section = COALESCE(@section, section),
            accepted_date = CASE WHEN @status = 'Accepted' AND accepted_date IS NULL THEN SYSDATETIME() ELSE accepted_date END,
            accepted_by = CASE WHEN @status = 'Accepted' AND accepted_by IS NULL THEN @action_user ELSE accepted_by END,
            in_progress_date = CASE WHEN @status = 'In Progress' AND in_progress_date IS NULL THEN SYSDATETIME() ELSE in_progress_date END,
            in_progress_by = CASE WHEN @status = 'In Progress' AND in_progress_by IS NULL THEN @action_user ELSE in_progress_by END,
            end_date = CASE WHEN @status = 'Completed' AND end_date IS NULL THEN SYSDATETIME() ELSE end_date END,
            completed_by = CASE WHEN @status = 'Completed' AND completed_by IS NULL THEN @action_user ELSE completed_by END
          WHERE id = @id
        `);
    }

    if (newNote && newNote.text) {
      await pool.request()
        .input('task_id', sql.Int, id)
        .input('note_text', sql.NVarChar(sql.MAX), newNote.text)
        .input('author', sql.VarChar(10), actionUser) 
        .query(`
          INSERT INTO Task_Notes (task_id, note_text, author, created_at)
          VALUES (@task_id, @note_text, @author, SYSDATETIME())
        `);
    }

    res.json({ message: "Update successful" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task." });
  }
});

// 🔴 DELETE: Remove a task
router.delete("/items/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });

  try {
    const pool = await getDbConnection();
    
    await pool.request()
      .input('id', sql.Int, id)
      .query("DELETE FROM Task_Notes WHERE task_id = @id");

    await pool.request()
      .input('id', sql.Int, id)
      .query("DELETE FROM Tasks WHERE id = @id");
      
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task." });
  }
});

export default router;