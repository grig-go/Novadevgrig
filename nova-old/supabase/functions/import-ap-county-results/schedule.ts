import { config } from "https://deno.land/x/dotenv/mod.ts";
import { runTask } from './deno.ts';
import { AP_CURRENT_ELECTION_DATE } from "../election/config.ts";

const env = config({ path: ".env" });   //.env based on every you run the deno command

const electionDate = env.AP_CURRENT_ELECTION_DATE ? env.AP_CURRENT_ELECTION_DATE : AP_CURRENT_ELECTION_DATE;

// 1. For Presidential County Results
const params = {
  electionDate: electionDate,  // "2024-11-05",
  officeID: "P",
  resultsType: "l",
  raceName: "Presidential Election",
  raceType: "presidential"
};

// You must run import-ap-state-results first to create the election and get state-level results
// wait 30 seconds for the state import to finish first
// runTask(params);

// Call every 30 seconds
setInterval(() => {
  runTask(params);
}, 30000);

// 2. For Senate County Results
const params2 = {
  electionDate: electionDate,
  officeID: "S",
  resultsType: "l",
  raceName: "Senate Election",
  raceType: "senate"
};

// You must run import-ap-county-results first to create the election and get state-level results
// wait 30 seconds for the state import to finish first
// runTask(params);

// Call every 30 seconds
setInterval(() => {
  runTask(params2);
}, 30000);