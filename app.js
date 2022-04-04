const express = require("express");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let db = null;
const initializeDBAndServer = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
  });
};

initializeDBAndServer();

//login API-1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `select * from user where username='${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "lenovolaptop");
      response.send({ jwtToken });
    } else {
      response.status(401);
      response.send("Invalid password");
    }
  }
});

const authToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  if (authHeader === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    token = authHeader.split(" ")[1];
    jwt.verify(token, "lenovolaptop", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        console.log(payload);
        next();
      }
    });
  }
};

//Get all states API-2
app.get("/states/", authToken, async (request, response) => {
  const getStatesQuery = `select state_id as stateId, state_name as stateName, population from state order by state_id`;
  const statesArray = await db.all(getStatesQuery);
  response.send(statesArray);
});

//get state API-3
app.get("/states/:stateId/", authToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `select state_id as stateId, state_name as stateName, population from state where state_id=${stateId};`;
  const res = await db.get(getStateQuery);
  response.send(res);
});

//create district API-4
app.post("/districts/", authToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const insertQuery = `insert into district (district_name, state_id,cases,cured,active,deaths)
  values('${districtName}',${stateId}, ${cases}, ${cured},${active}, ${deaths});`;
  const result = db.run(insertQuery);
  response.send("District Successfully Added");
});

//get district API-5
app.get("/districts/:districtId/", authToken, async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `select district_id as districtId, district_name as districtName, state_id as stateId, cases, cured, active, deaths  from district where district_id=${districtId};`;
  const res = await db.get(getDistrictQuery);
  response.send(res);
});

//delete district API-6
app.delete("/districts/:districtId/", authToken, async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `delete from district where district_id=${districtId};`;
  const delRes = await db.get(deleteDistrictQuery);
  response.send("District Removed");
});

//update district API-7
app.put("/districts/:districtId/", authToken, async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `update district
                                    set district_name='${districtName}',
                                    state_id=${stateId},
                                    cases=${cases},
                                    cured=${cured},
                                    active=${active},
                                    deaths=${deaths}
                                    where district_id=${districtId};`;
  const updateRes = await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//get state API-8
app.get("/states/:stateId/stats", authToken, async (request, response) => {
  const { stateId } = request.params;
  const getDistrictStatsQuery = `select 
  SUM(cases) as totalCases,
  SUM(cured) as totalCured,
  SUM(active) as totalActive,
  SUM(deaths) as totalDeaths
  from district where state_id=${stateId};`;
  const res = await db.get(getDistrictStatsQuery);
  response.send(res);
});

//create user API-9
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const insertUser = `insert into user 
    (username, name, password, gender,location)
    values('${username}','${name}','${hashedPassword}','${gender}','${location}');`;
  const res = await db.run(insertUser);
  response.send("User created successfully");
});

module.exports = app;
