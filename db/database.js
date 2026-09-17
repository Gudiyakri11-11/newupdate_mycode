// import sql from "mssql";
 
// const dbConfig = {
//   user: 'sa',             // Updated username
//   password: 'password-1', // Updated password
//   server: "LTIN617659",
//   database: "Genai_buddy_db",
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//     // instanceName: 'SQLEXPRESS'
//   },
//   port: 1433,
// };
 
// let pool;
 
// export const getDbConnection = async () => {
//   try {
//     if (pool) {
//       return pool;
//     }
   
//     pool = await sql.connect(dbConfig);
//     console.log("✅ SQL Server connected");
//     return pool;
//   } catch (error) {
//     console.error("❌ Database connection failed:", error);
//     throw error;
//   }
// };
 
// export { sql };
 
 

import sql from "mssql";

const dbConfig = {
  user: 'gen',
  password: 'Geai@2403_SecreT!01', 
  server: "CPCINPUDV745207", 
  database: "genai_buddy_db_prod",
  options: {
    encrypt: false, 
    trustServerCertificate: true, 
    instanceName: 'SQLEXPRESS'
  },
   port :1433, 
};

let poolPromise;

export const getDbConnection = async () => {
  try {
    if (!poolPromise) {
      // Initiate the connection and save the pending Promise
      poolPromise = sql.connect(dbConfig)
        .then(pool => {
          console.log("✅ SQL Server connected globally");
          return pool;
        })
        .catch(error => {
          console.error("❌ Database connection failed:", error);
          poolPromise = null; // Reset on failure so it can try again
          throw error;
        });
    }
    
    // All concurrent requests will simply wait for this single Promise to resolve
    return await poolPromise;

  } catch (error) {
    throw error;
  }
};

export { sql };


// import sql from "mssql";

// const dbConfig = {
//   user: 'test_login', // MyLogin
//   password: 'StrongP@ssw0rd',  // StrongP@ssw0rd
//   server: "LTIN672592", 
//   database: "genai_buddy_db",
//   options: {
//     encrypt: false, 
//     trustServerCertificate: true, 
//     instanceName: 'SQLEXPRESS'
//   },
//   // port :49763, 
// };

// let poolPromise;

// export const getDbConnection = async () => {
//   try {
//     if (!poolPromise) {
//       // Initiate the connection and save the pending Promise
//       poolPromise = sql.connect(dbConfig)
//         .then(pool => {
//           console.log("✅ SQL Server connected globally");
//           return pool;
//         })
//         .catch(error => {
//           console.error("❌ Database connection failed:", error);
//           poolPromise = null; // Reset on failure so it can try again
//           throw error;
//         });
//     }
    
//     // All concurrent requests will simply wait for this single Promise to resolve
//     return await poolPromise;

//   } catch (error) {
//     throw error;
//   }
// };

// export { sql };