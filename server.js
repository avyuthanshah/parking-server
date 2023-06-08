const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Create a new connection pool
const pool = new Pool({
  user: "park",
  host: "parkmanager.postgres.database.azure.com",
  database: "parking-management",
  password: "EErexx0#",
  port: 5432, // Default PostgreSQL port
  ssl: true,
});

// Define your routes here
app.post("/register", (req, res) => {
  try {
    const { vehicle_no_plate, owner, contact, password } = req.body;
    const remaining = 0;
    pool.query(
      "SELECT * FROM users WHERE vehicle_no_plate = $1",
      [vehicle_no_plate],
      (error, results) => {
        if (error) {
          console.error("Error executing query", error);
        }
        if (results.rows.length > 0) {
          console.log("User exists!");
          // msg = "User already exists";
          return res.status(400).json({ message: "User already exists" });
        } else {
          pool.query(
            "INSERT INTO users (vehicle_no_plate, owner, contact, remaining, password) VALUES ($1,$2,$3,$4,$5)",
            [vehicle_no_plate, owner, contact, remaining, password],
            (error, result) => {
              if (error) {
                console.error("Error executing query", error);
              }
              console.log("User inserted successfully!");
              // msg = "User registered successfully!";
              return res.json({ message: "User registered successfully!" });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error", error);
    return res.status(400).json({ message: "Registration failed!" });
  }
});

app.post("/login", (req, res) => {
  try {
    const { vehicle_no_plate, password } = req.body;
    pool.query(
      "SELECT * FROM users WHERE vehicle_no_plate = $1 AND password = $2 LIMIT 1",
      [vehicle_no_plate, password],
      (error, results) => {
        if (error) {
          console.error("Error executing query", error);
          return;
        }
        if (results.rows.length > 0) {
          const user = results.rows[0];
          console.log("User:", user);
          return res.json({ user: user });
        } else {
          console.log("User not found.");
          return res.json({ message: "User not found" });
        }
      }
    );
  } catch (error) {
    console.error("Error", error);
    return res.json({ message: "Login failed" });
  }
});

app.put("/getMembership", (req, res) => {
  try {
    const { vehicle_no_plate, remaining } = req.body;
    pool.query(
      "UPDATE users SET remaining = $2 WHERE vehicle_no_plate = $1",
      [vehicle_no_plate, remaining],
      (error, results) => {
        if (error) {
          console.error("Error executing query", error);
        }
        return res.json({ message: "Membership updated!" });
      }
    );
  } catch (error) {
    console.error("Error", error);
    return res.json({ message: "Membership update failed" });
  }
});

app.get("/parking", (req, res) => {
  try {
    const parking = [
      ["Parking A", "27.611129, 85.529401", 50, 0],
      ["Parking B", "27.583176, 85.515482", 25, 0],
      ["Parking C", "27.591102, 85.526015", 15, 0],
    ];
    parking.forEach((element) => {
      pool.query(
        "INSERT INTO parking_areas (parking_name, location, capacity, occupancy) VALUES ($1,$2,$3,$4)",
        [element[0], element[1], element[2], element[3]],
        (error, results) => {
          if (error) {
            console.error("Error executing query", error);
          }
        }
      );
    });
    return res.json({ message: "Parking data seeded!" });
  } catch (error) {
    return res.json({ message: "Membership update failed" });
  }
});

app.post("/entry", (req, res) => {
  try {
    const { vehicle_no_plate } = req.body;
    pool.query(
      "SELECT * FROM users WHERE vehicle_no_plate = $1 LIMIT 1",
      [vehicle_no_plate],
      (error, results) => {
        if (error) {
          console.error("Error executing query", error);
          return;
        }
        if (results.rows.length == 0) {
          pool.query(
            "INSERT INTO users (vehicle_no_plate, owner, contact, remaining, password) VALUES ($1,$2,$3,$4,$5)",
            [vehicle_no_plate, "", 0, 0, ""]
          );
        }
        const start = Date.now();
        pool.query(
          "UPDATE users SET time_calc = $2 WHERE vehicle_no_plate = $1",
          [vehicle_no_plate, start],
          (error, results) => {
            if (error) {
              console.error("Error executing query", error);
            }
          }
        );
        return res.json({ message: "Entry successfull" });
      }
    );
  } catch (error) {
    return res.json({ message: "Membership update failed" });
  }
});

app.post("/exit", (req, res) => {
  try {
    const { vehicle_no_plate } = req.body;
    pool.query(
      "SELECT * FROM users WHERE vehicle_no_plate = $1 LIMIT 1",
      [vehicle_no_plate],
      (error, results) => {
        if (error) {
          console.error("Error executing query", error);
          return;
        }
        if (results.rows.length > 0 && results.rows[0].time_calc != 0) {
          const user = results.rows[0];
          if (user.remaining > 0) {
            pool.query(
              "UPDATE users SET remaining = $2, time_calc = 0 WHERE vehicle_no_plate = $1",
              [vehicle_no_plate, user.remaining - 1],
              (error, results) => {
                if (error) {
                  console.error("Error executing query", error);
                }
              }
            );
            return res.json({
              message: "Member exited successfully",
              remaining: user.remaining - 1,
            });
          } else {
            const end = Date.now();
            const time = end - user.time_calc;
            const fee = time * 0.0000275;
            if (user.owner == "") {
              pool.query("DELETE FROM users WHERE vehicle_no_plate = $1", [
                vehicle_no_plate,
              ]);
            } else {
              pool.query(
                "UPDATE users SET time_calc = 0 WHERE vehicle_no_plate = $1",
                [vehicle_no_plate],
                (error, results) => {
                  if (error) {
                    console.error("Error executing query", error);
                  }
                }
              );
            }
            return res.json({
              message: "Non-member exited successfully",
              cost: fee,
            });
          }
        } else {
          console.log("User not found.");
          return res.json({ message: "User not found parking!" });
        }
      }
    );
  } catch (error) {
    return res.json({ message: "Membership update failed" });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
