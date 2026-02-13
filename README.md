# Blood Panel Tracker

A web application for visualizing and comparing bloodwork metrics over time. Built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- **List View**: Sortable table with all metrics, sparklines, and change indicators
- **Trend View**: Line chart for individual metrics with reference range bands
- **Overlay View**: Compare multiple metrics on the same chart (normalized or raw units)
- **Dark/Light Mode**: Follows system preference with manual toggle
- **Date Filtering**: Filter by date range or show most recent only
- **CSV Export**: Export selected metrics to CSV
- **Metric Search**: Searchable sidebar grouped by category

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd Program
npm install
```

### Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The app will be available at `http://localhost:3000`.

### Running Tests

```bash
npm test
```

---

## Adding New Bloodwork Data

### Step 1: Create the JSON File

Create a new JSON file in `src/data/` with your bloodwork results. Use the naming convention `MM-DD-YY.json` (e.g., `03-15-26.json`).

The file must follow this structure:

```json
{
  "collection_date": "YYYY-MM-DD",
  "panels": [
    {
      "panel_name": "Panel Name Here",
      "tests": [
        {
          "name": "Test Name",
          "result": 123.4,
          "unit": "mg/dL",
          "reference_range": "70 - 100",
          "flag": null
        }
      ]
    }
  ]
}
```

#### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `collection_date` | string | Date blood was drawn (YYYY-MM-DD format) |
| `panel_name` | string | Name of the test panel (e.g., "CBC with Auto Differential") |
| `name` | string | Name of the individual test |
| `result` | number or string | The test value. Use strings for comparators like `"<5.0"` or `">59"` |
| `unit` | string or null | Unit of measurement |
| `reference_range` | string or null | Reference range. Formats: `"70 - 100"`, `">60"`, `"<= 99"`, or `null` |
| `flag` | `"High"`, `"Low"`, `"H"`, `"L"`, or `null` | Abnormal flag from the lab |
| `comments` | string (optional) | Any additional notes from the lab |

### Step 2: Register the Data File

Open `src/lib/useBloodworkData.ts` and add your new file:

```typescript
// Add import at the top with the other imports
import data0315 from '../data/03-15-26.json'

// Add to the files array in useBloodworkData()
const files = [
  { data: data0103, filename: '01-03-24.json' },
  { data: data0928, filename: '09-28-24.json' },
  { data: data1008, filename: '10-08-25.json' },
  { data: data0127, filename: '01-27-26.json' },
  { data: data0315, filename: '03-15-26.json' },  // Add your new file
]
```

That's it! The application will automatically parse and display the new data.

---

## Customizing Metric Aliases

Different labs may use different names for the same test. The alias system unifies these names so metrics are properly tracked across files.

### Adding Aliases

Edit `src/lib/metricAliases.ts`:

```typescript
export const metricAliases: Record<string, string> = {
  // Add your aliases (lowercase key -> canonical name)
  'your lab name (lowercase)': 'Canonical Name',
  
  // Example: different names for the same test
  'free t4 (direct)': 'Free T4',
  'free t4': 'Free T4',
  'ft4': 'Free T4',
}
```

**Rules:**
- Keys must be lowercase
- The canonical name (value) controls how the metric is displayed and grouped
- All variations of a test name should map to the same canonical name

### Example

If your lab reports "Triiodothyronine, Free Serum" but another lab reports "Free T3":

```typescript
'triiodothyronine, free serum': 'Free T3',
'free t3': 'Free T3',
't3, free': 'Free T3',
```

---

## Adding Metric Descriptions

Descriptions appear in hover tooltips throughout the app.

### Adding Descriptions

Edit `src/lib/metricDescriptions.ts`:

```typescript
export const metricDescriptions: Record<string, string> = {
  // Key must match the canonical metric name
  'Free T4': 'Free Thyroxine. The active form of T4 available to tissues. Important for metabolism regulation.',
  
  // Add your descriptions
  'Your Metric': 'Description of what this metric measures and what abnormal values might indicate.',
}
```

**Tips:**
- Keep descriptions concise (1-2 sentences)
- Include what the metric measures
- Mention what high/low values might indicate
- The key must match the canonical name from `metricAliases.ts`

---

## Customizing Categories

Categories control how metrics are grouped in the sidebar.

### Changing Panel Categories

Edit the `categoryOverrides` map in `src/lib/parser.ts`:

```typescript
const categoryOverrides: Record<string, string> = {
  // Map panel names or test names to categories
  'CBC with Platelet Count and Auto Diff': 'CBC',
  'Comprehensive Metabolic Panel (14)': 'Metabolic Panel',
  'Lipid Panel with LDL/HDL Ratio': 'Lipids',
  
  // Individual tests can also be categorized
  'Testosterone': 'Hormones',
  'DHEA-S': 'Hormones',
}
```

By default, tests are grouped by their `panel_name`. Use overrides to:
- Combine similar panels (e.g., all lipid panels into "Lipids")
- Move individual tests to different categories
- Standardize category names across different lab formats

---

## Project Structure

```
Program/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main application page
│   │   ├── layout.tsx        # Root layout with metadata
│   │   └── globals.css       # Global styles and Tailwind
│   │
│   ├── components/
│   │   ├── MetricSidebar.tsx # Searchable metric list
│   │   ├── MetricTable.tsx   # List view with sparklines
│   │   ├── TrendChart.tsx    # Single metric trend chart
│   │   ├── OverlayChart.tsx  # Multi-metric overlay chart
│   │   ├── TooltipCard.tsx   # Hover tooltip component
│   │   ├── Sparkline.tsx     # Mini inline charts
│   │   ├── Header.tsx        # App header with controls
│   │   └── ErrorPanel.tsx    # Validation error display
│   │
│   ├── data/
│   │   └── *.json            # Bloodwork data files
│   │
│   ├── lib/
│   │   ├── parser.ts         # JSON parsing and normalization
│   │   ├── parser.test.ts    # Parser unit tests
│   │   ├── metricAliases.ts  # Metric name unification
│   │   ├── metricDescriptions.ts  # Tooltip descriptions
│   │   ├── useBloodworkData.ts    # Data loading hook
│   │   └── utils.ts          # Utility functions
│   │
│   └── types/
│       └── bloodwork.ts      # TypeScript types and Zod schemas
│
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── jest.config.js
```

---

## Data Model

### MetricReading

Each test result is normalized to this structure:

```typescript
type MetricReading = {
  metricId: string       // Slugified canonical name (e.g., "free_t4")
  metricName: string     // Display name (e.g., "Free T4")
  category: string       // Grouping category (e.g., "Thyroid")
  date: string           // Collection date (YYYY-MM-DD)
  value: number | null   // Numeric value (null if non-numeric)
  valueText: string      // Original value as string
  comparator: '<' | '>' | '<=' | '>=' | '=' | null
  unit: string           // Unit of measurement
  refLow?: number        // Reference range lower bound
  refHigh?: number       // Reference range upper bound
  refText?: string       // Original reference range string
  flag: 'Low' | 'Normal' | 'High' | null
  sourceFile: string     // Which JSON file this came from
}
```

### Parsing Rules

**Results:**
- Numeric values are used directly
- String values like `"<5.0"` extract the number and set comparator

**Reference Ranges:**
- `"70 - 100"` → refLow: 70, refHigh: 100
- `">60"` or `"60 <="` → refLow: 60
- `"<100"` or `"<= 99"` → refHigh: 100/99

**Flags:**
- Lab-provided flags (`H`, `L`, `High`, `Low`) take precedence
- If no flag but has reference range, auto-computed:
  - value < refLow → Low
  - value > refHigh → High
  - otherwise → Normal
- Comparator results (e.g., `<5.0`) are not auto-flagged (ambiguous)

---

## Troubleshooting

### New data not showing up

1. Verify the JSON file is valid (check for syntax errors)
2. Ensure the file is imported in `useBloodworkData.ts`
3. Check the browser console for parsing errors
4. Verify `collection_date` is in `YYYY-MM-DD` format

### Metrics not grouping correctly

1. Check if different labs use different names for the same test
2. Add aliases in `metricAliases.ts` mapping variations to a canonical name
3. Ensure alias keys are lowercase

### Reference range not parsing

Supported formats:
- `"70 - 100"` (with spaces around dash)
- `"70-100"` (without spaces)
- `">60"`, `">= 60"`, `"60 <="`
- `"<100"`, `"<= 100"`

Unsupported:
- Ranges with units (e.g., `"70 - 100 mg/dL"`)
- Text descriptions (e.g., `"Normal"`)

---

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Validation**: Zod
- **Icons**: Lucide React
- **Testing**: Jest
