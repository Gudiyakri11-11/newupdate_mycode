// // middleware/auth.js (or wherever your middleware is located)
// import jwt from "jsonwebtoken";

// export const authenticateToken = (req, res, next) => {
//   // 1. Get the token strictly from the HttpOnly cookie
//   const token = req.cookies?.token;

//   if (!token) {
//     return res.status(401).json({ message: "Access denied. No valid session found." });
//   }

//   // 2. Verify the token
//   jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
//     if (err) {
//       return res.status(403).json({ message: "Your session has expired or is invalid. Please log in again." });
//     }

//     // 3. Attach the decoded user payload to the request object
//     req.user = decodedUser;
    
//     // 4. Move to the next middleware or route handler
//     next();
//   });
// };

// export const requireAdmin = (req, res, next) => {
//   if (req.user.activeRole !== "admin") {
//     return res.status(403).json({ message: "Admin privileges required to access this resource." });
//   }
//   next();
// };


import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  // 1. Get the token strictly from the HttpOnly cookie
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No valid session found." });
  }

  // 2. Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ message: "Your session has expired or is invalid. Please log in again." });
    }

    // 3. Attach the decoded user payload to the request object
    req.user = decodedUser;
    
    // 4. Move to the next middleware or route handler
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  if (req.user.activeRole !== "admin") {
    return res.status(403).json({ message: "Admin privileges required to access this resource." });
  }
  next();
};

// ============================================================================
// 🕵️‍♂️ ANTI-FORGERY SECURITY: DEEP DRILL-DOWN IDENTITY CHECKER
// ============================================================================

// Helper function to recursively hunt down 'employeeId' anywhere in the payload
const huntForEmployeeIds = (data, foundIds = new Set()) => {
  if (!data || typeof data !== "object") return foundIds;

  // Handle Arrays (e.g., if they pass a list of objects)
  if (Array.isArray(data)) {
    data.forEach(item => huntForEmployeeIds(item, foundIds));
    return foundIds;
  }

  // Handle Nested Objects
  for (const key in data) {
    if (key === "employeeId") {
      // Found one! Convert to string and trim just to be safe
      foundIds.add(String(data[key]).trim());
    } else if (typeof data[key] === "object") {
      // Deep dive into the next layer
      huntForEmployeeIds(data[key], foundIds);
    }
  }

  return foundIds;
};

export const catchIdentityTheft = (req, res, next) => {
  // 1. If there's no user token or no body payload, skip the check
  if (!req.user || !req.user.employeeId || !req.body) {
    return next();
  }

  // 2. IMPORTANT: Admins and Moderators are ALLOWED to modify other users' data, 
  // so we must let them pass without triggering the alarm.
  if (req.user.activeRole === "admin" || req.user.activeRole === "moderator") {
    return next();
  }

  const trueIdentity = String(req.user.employeeId).trim();
  
  // 3. Unleash the recursive bloodhound to find every employeeId hidden in the request body
  const allSubmittedIds = Array.from(huntForEmployeeIds(req.body));

  // 4. Check if they tried to sneak in an ID that isn't theirs
  const forgedId = allSubmittedIds.find(id => id !== trueIdentity && id !== "");

  if (forgedId) {
    // 🤡 The Funny Negative Response
    return res.status(403).json({
      success: false,
      error: "Identity Theft Detected",
      message: `You are logged in as ${trueIdentity}, but you tried to sneak in data for ${forgedId}.`
    });
  }

  // 5. If everything matches their true identity perfectly, let them proceed
  next();
};