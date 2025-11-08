import { config } from "https://deno.land/x/dotenv/mod.ts";
import { runTask } from './deno.ts';
import { AP_CURRENT_ELECTION_DATE } from "../election/config.ts";

const env = config({ path: ".env" });   //.env based on every you run the deno command

const electionDate = env.AP_CURRENT_ELECTION_DATE ? env.AP_CURRENT_ELECTION_DATE : AP_CURRENT_ELECTION_DATE;

// 1. For House District Results
const params = {
  electionDate: electionDate,  // "2024-11-05",
  officeID: "H",
  resultsType: "l",
  raceName: "House Election",
  raceType: "house"
};

// wait 30 seconds for the state import to finish first even house doesn't have state data!!
//runTask(params);

// Call every 30 seconds
setInterval(() => {
  runTask(params);
}, 30000);