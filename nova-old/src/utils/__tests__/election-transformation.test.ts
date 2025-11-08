import { applyTransformation } from '../transformations';

describe('Election Data Transformation', () => {
  const sampleElectionData = [
    {
      "_id": "brgfBrRgJ7cjR7tEb",
      "raceId": "ND_393",
      "name": "NYC Mayor",
      "candidates": [
        {
          "_id": "8sYuwgGc4QZzASXuq",
          "apId": 1823,
          "firstName": "Zohran",
          "lastName": "Mamdani",
          "parties": [
            {
              "name": "Democrat",
              "abbr": "D"
            }
          ],
          "isIncumbent": false
        },
        {
          "_id": "FtNNMb6za77chSTjY",
          "apId": 5,
          "firstName": "Andrew",
          "lastName": "Cuomo",
          "parties": [
            {
              "name": "Independent",
              "abbr": "IN"
            }
          ],
          "isIncumbent": false
        },
        {
          "_id": "BQ6rkGwuAGt3bgP3C",
          "apId": 1825,
          "firstName": "Curtis",
          "lastName": "Sliwa",
          "parties": [
            {
              "name": "Republican",
              "abbr": "R"
            }
          ],
          "isIncumbent": false
        },
        {
          "_id": "gHhkGKvneGcSDbMhA",
          "apId": 1824,
          "firstName": "Eric",
          "lastName": "Adams",
          "parties": [
            {
              "name": "Independent",
              "abbr": "IN"
            }
          ],
          "isIncumbent": true
        }
      ],
      "results": {
        "candidateResults": [
          {
            "candidateId": "8sYuwgGc4QZzASXuq",
            "votes": 1036051,
            "isWinner": true,
            "pctVotes": 50.6980920643775
          },
          {
            "candidateId": "FtNNMb6za77chSTjY",
            "votes": 855000,
            "isWinner": false,
            "pctVotes": 41.838547248198
          },
          {
            "candidateId": "BQ6rkGwuAGt3bgP3C",
            "votes": 146137,
            "isWinner": false,
            "pctVotes": 7.15106406925136
          },
          {
            "candidateId": "gHhkGKvneGcSDbMhA",
            "votes": 6382,
            "isWinner": false,
            "pctVotes": 0.312296618173099
          }
        ],
        "totalVotes": 2043570
      }
    }
  ];

  test('should transform election data with default options', async () => {
    const result = await applyTransformation(
      sampleElectionData[0],
      'custom-aggregate',
      {
        aggregateType: 'election-chart'
      }
    );

    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('percentage');
    expect(Array.isArray(result.label)).toBe(true);
    expect(Array.isArray(result.percentage)).toBe(true);
    expect(result.label.length).toBe(4);
    expect(result.percentage.length).toBe(4);
  });

  test('should transform to match expected output format', async () => {
    const result = await applyTransformation(
      sampleElectionData[0],
      'custom-aggregate',
      {
        aggregateType: 'election-chart',
        candidatesPath: 'candidates',
        resultsPath: 'results.candidateResults',
        labelField: 'lastName',
        valueField: 'pctVotes',
        sortBy: 'percentage',
        sortOrder: 'desc'
      }
    );

    expect(result).toEqual({
      label: ['Mamdani', 'Cuomo', 'Sliwa', 'Adams'],
      percentage: [51, 42, 7, 0] // Rounded values
    });
  });

  test('should include votes when requested', async () => {
    const result = await applyTransformation(
      sampleElectionData[0],
      'custom-aggregate',
      {
        aggregateType: 'election-chart',
        includeVotes: true
      }
    );

    expect(result).toHaveProperty('votes');
    expect(Array.isArray(result.votes)).toBe(true);
    expect(result.votes).toEqual([1036051, 855000, 146137, 6382]);
  });

  test('should include winner flags when requested', async () => {
    const result = await applyTransformation(
      sampleElectionData[0],
      'custom-aggregate',
      {
        aggregateType: 'election-chart',
        includeWinner: true
      }
    );

    expect(result).toHaveProperty('isWinner');
    expect(Array.isArray(result.isWinner)).toBe(true);
    expect(result.isWinner[0]).toBe(true); // Mamdani is the winner
    expect(result.isWinner.slice(1).every(w => w === false)).toBe(true);
  });

  test('should handle array of races', async () => {
    const result = await applyTransformation(
      sampleElectionData,
      'custom-aggregate',
      {
        aggregateType: 'election-chart'
      }
    );

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('label');
    expect(result[0]).toHaveProperty('percentage');
  });

  test('should sort by votes ascending', async () => {
    const result = await applyTransformation(
      sampleElectionData[0],
      'custom-aggregate',
      {
        aggregateType: 'election-chart',
        sortBy: 'votes',
        sortOrder: 'asc'
      }
    );

    expect(result.label[0]).toBe('Adams'); // Lowest votes
    expect(result.label[3]).toBe('Mamdani'); // Highest votes
  });

  test('should use custom label field', async () => {
    const result = await applyTransformation(
      sampleElectionData[0],
      'custom-aggregate',
      {
        aggregateType: 'election-chart',
        labelField: 'firstName'
      }
    );

    expect(result.label).toEqual(['Zohran', 'Andrew', 'Curtis', 'Eric']);
  });

  test('should handle custom script transformation', async () => {
    const result = await applyTransformation(
      sampleElectionData[0],
      'custom-aggregate',
      {
        aggregateType: 'custom-script',
        script: `
          return {
            raceName: data.name,
            candidateCount: data.candidates.length,
            totalVotes: data.results.totalVotes
          };
        `
      }
    );

    expect(result).toEqual({
      raceName: 'NYC Mayor',
      candidateCount: 4,
      totalVotes: 2043570
    });
  });

  test('should handle missing data gracefully', async () => {
    const invalidData = {
      name: "Test Race",
      candidates: null,
      results: null
    };

    const result = await applyTransformation(
      invalidData,
      'custom-aggregate',
      {
        aggregateType: 'election-chart'
      }
    );

    // Should return original data if transformation fails
    expect(result).toEqual(invalidData);
  });
});
