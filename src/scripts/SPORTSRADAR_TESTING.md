# Sportsradar API Testing Scripts

Quick standalone test scripts for debugging Sportsradar API integration outside of the main application.

## 📋 Available Scripts

### 1. Test Seasons API
**File:** `test-sportsradar-seasons.js`  
**Purpose:** Find available seasons for a competition

```bash
SR_KEY=your_api_key node scripts/test-sportsradar-seasons.js
```

**Custom Competition:**
```bash
SR_KEY=your_api_key COMPETITION_ID=sr:competition:17 node scripts/test-sportsradar-seasons.js
```

**Output Example:**
```
✅ Success!

Competition: Premier League
Total Seasons: 15

📅 Available Seasons:

1. Premier League 24/25
   ID: sr:season:118689
   Year: 24/25
   Status: ✅ ACTIVE ⭐ CURRENT
   Start: 2024-08-16
   End: 2025-05-25

2. Premier League 23/24
   ID: sr:season:105353
   Year: 23/24
   Status: ✅ ACTIVE
   Start: 2023-08-11
   End: 2024-05-19
```

### 2. Test Competitors API
**File:** `test-sportsradar-competitors.js`  
**Purpose:** Fetch teams/competitors for a specific season

```bash
SR_KEY=your_api_key node scripts/test-sportsradar-competitors.js
```

**Custom Season:**
```bash
SR_KEY=your_api_key SEASON_ID=sr:season:118689 node scripts/test-sportsradar-competitors.js
```

**Output Example:**
```
✅ Success!

{
  "success": true,
  "teamsAdded": 20,
  "seasonId": "sr:season:118689",
  "seasonName": "Premier League 24/25",
  "seasonYear": "24/25",
  "competitionId": "sr:competition:17",
  "competitionName": "Premier League"
}

📊 Sample Team Data:

{
  "id": "sr:competitor:35",
  "name": "Manchester City",
  "abbreviation": "MCI",
  "country": "England",
  "country_code": "ENG"
}

📋 All 20 Teams:
  1. Arsenal (ARS) - sr:competitor:42
  2. Aston Villa (AVL) - sr:competitor:37
  3. Bournemouth (BOU) - sr:competitor:30
  ...
```

## 🚀 Quick Workflow

### Step 1: Find a Competition's Seasons
```bash
# LaLiga (default)
SR_KEY=$SR_KEY node scripts/test-sportsradar-seasons.js

# Premier League
SR_KEY=$SR_KEY COMPETITION_ID=sr:competition:17 node scripts/test-sportsradar-seasons.js

# Serie A
SR_KEY=$SR_KEY COMPETITION_ID=sr:competition:23 node scripts/test-sportsradar-seasons.js
```

### Step 2: Test Competitors for Current Season
Copy the season_id from step 1 and use it:

```bash
SR_KEY=$SR_KEY SEASON_ID=sr:season:118689 node scripts/test-sportsradar-competitors.js
```

## 🔑 Common Competition IDs

| Competition | ID | Country |
|-------------|-------|---------|
| Premier League | `sr:competition:17` | England |
| LaLiga | `sr:competition:8` | Spain |
| Serie A | `sr:competition:23` | Italy |
| Bundesliga | `sr:competition:34` | Germany |
| Ligue 1 | `sr:competition:34` | France |
| Champions League | `sr:competition:7` | Europe |
| Europa League | `sr:competition:679` | Europe |
| MLS | `sr:competition:242` | USA |
| Liga MX | `sr:competition:334` | Mexico |

## 🐛 Error Handling

### 401 Unauthorized
```
❌ Error: 401 Unauthorized

💡 Tip: Check your SR_KEY environment variable
```

**Fix:** Verify your Sportsradar API key is correct.

### 404 Not Found
```
❌ Error: 404 Not Found

💡 Tip: Season ID may not exist or may be for a different sport
   Try finding a valid season_id first with the seasons API
```

**Fix:** Use the seasons script first to find valid season IDs.

### 429 Rate Limit
```
❌ Error: 429 Too Many Requests

💡 Tip: Rate limit exceeded. Wait 60 seconds and try again.
```

**Fix:** Wait 60 seconds. Trial keys have 1 request/second limit.

## 💡 Use Cases

### Use Case 1: Verify API Key Works
```bash
SR_KEY=your_key node scripts/test-sportsradar-seasons.js
```

If this works, your API key is valid!

### Use Case 2: Debug "No Teams Found" Issue
```bash
# Step 1: Check what seasons exist
SR_KEY=$SR_KEY COMPETITION_ID=sr:competition:8 node scripts/test-sportsradar-seasons.js

# Step 2: Test the current season
SR_KEY=$SR_KEY SEASON_ID=sr:season:105353 node scripts/test-sportsradar-competitors.js
```

### Use Case 3: Compare with Backend Results
Run the competitors script, then compare with what the Nova Dashboard shows in the League Testing panel. The `seasonId` should match!

### Use Case 4: Test New Competitions
Before adding a new league to Nova Dashboard:

```bash
# 1. Find seasons
SR_KEY=$SR_KEY COMPETITION_ID=sr:competition:242 node scripts/test-sportsradar-seasons.js

# 2. Verify teams exist
SR_KEY=$SR_KEY SEASON_ID=<from_step_1> node scripts/test-sportsradar-competitors.js
```

## 📊 Integration with Nova Dashboard

These scripts test the **same API endpoints** used by Nova Dashboard:

**Nova Dashboard Flow:**
```
1. User selects "Premier League" in Sports Dashboard
2. Backend calls: /competitions/sr:competition:17/seasons.json
3. Backend finds current season: sr:season:118689
4. Backend calls: /seasons/sr:season:118689/competitors.json
5. Teams are saved to database
```

**Your Test Script Flow:**
```bash
# Step 1: Same as Nova (find seasons)
SR_KEY=$SR_KEY COMPETITION_ID=sr:competition:17 node scripts/test-sportsradar-seasons.js

# Step 2: Same as Nova (get teams)
SR_KEY=$SR_KEY SEASON_ID=sr:season:118689 node scripts/test-sportsradar-competitors.js
```

The `seasonId` shown in Nova Dashboard's test panel **matches** what you see in these scripts!

## 🔧 Customization

### Add Custom Output
Edit `test-sportsradar-competitors.js`:

```javascript
// Add team stats display
if (sampleTeam.statistics) {
  console.log('\n📈 Team Statistics:');
  console.log(JSON.stringify(sampleTeam.statistics, null, 2));
}
```

### Save to File
```bash
SR_KEY=$SR_KEY SEASON_ID=sr:season:118689 \
  node scripts/test-sportsradar-competitors.js > output.json
```

### Test Multiple Seasons
```bash
#!/bin/bash
for season in sr:season:118689 sr:season:105353 sr:season:97283; do
  echo "Testing $season..."
  SR_KEY=$SR_KEY SEASON_ID=$season node scripts/test-sportsradar-competitors.js
  echo "---"
done
```

## 📝 Script Details

### Features

Both scripts include:
- ✅ Clear error messages
- ✅ Helpful troubleshooting tips
- ✅ Color-coded output (✅/❌/⭐)
- ✅ Formatted JSON
- ✅ Environment variable support
- ✅ Exit codes (0 = success, 1 = error)

### Requirements

- **Node.js**: v18+ (for native fetch support)
- **Environment**: SR_KEY environment variable
- **Network**: Internet access to api.sportradar.com

### Performance

- **Seasons API**: ~200-500ms response time
- **Competitors API**: ~300-800ms response time
- **Rate Limit**: 1 request/second (trial keys)

## 🎯 Next Steps

After testing with these scripts:

1. ✅ **Verify API Access** - Seasons script works
2. ✅ **Find Valid Seasons** - Note the current season_id
3. ✅ **Test Competitors** - Verify teams are returned
4. ✅ **Use in Nova** - Add the league in Sports Dashboard
5. ✅ **Compare Results** - season_id should match in both places

## 📚 Related Documentation

- **[SPORTS_LEAGUE_TEST_QUICKSTART.md](/SPORTS_LEAGUE_TEST_QUICKSTART.md)** - Nova Dashboard testing
- **[SPORTS_SEASON_ID_DEBUG_ENHANCEMENT.md](/SPORTS_SEASON_ID_DEBUG_ENHANCEMENT.md)** - Season ID debug feature
- **[SPORTS_COMPETITORS_API_FIX.md](/SPORTS_COMPETITORS_API_FIX.md)** - Competitors API implementation
- **[SPORTSRADAR_INTEGRATION_COMPLETE.md](/SPORTSRADAR_INTEGRATION_COMPLETE.md)** - Full integration guide

## 🆘 Troubleshooting

### Script Won't Run

**Problem:** `node: command not found`

**Fix:** Install Node.js v18+

### Environment Variable Not Set

**Problem:** `❌ Error: SR_KEY environment variable not set`

**Fix:**
```bash
export SR_KEY=your_api_key_here
node scripts/test-sportsradar-seasons.js
```

### Permission Denied

**Problem:** `permission denied: ./test-sportsradar-seasons.js`

**Fix:**
```bash
chmod +x scripts/test-sportsradar-seasons.js
./scripts/test-sportsradar-seasons.js
```

Or just use `node`:
```bash
node scripts/test-sportsradar-seasons.js
```

---

**Pro Tip:** These scripts are **standalone** and don't require the full Nova Dashboard app to run. Perfect for quick API testing!
