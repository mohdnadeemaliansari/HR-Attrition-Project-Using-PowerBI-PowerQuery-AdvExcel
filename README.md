# HR-Attrition-Project-Using-PowerBI-PowerQuery-AdvExcel
# HR Attrition & Performance — Multi-Page Dashboard

A front-end rebuild of the HR Attrition Power BI report (`HR_Attrition_Project.pbix`) as a
six-page website in plain HTML, CSS and JavaScript. No frameworks, no chart library, no build
step — open `index.html` and it runs.

## Pages

| File | Page | Mirrors |
|---|---|---|
| `index.html` | Overview | Home page |
| `attrition.html` | Attrition | Attrition page |
| `performance.html` | Performance | Performance page |
| `salary.html` | Salary | Salary page |
| `insights.html` | Key insights | Insight's page |
| `action-plan.html` | The way forward | Conclusion page |

Each page is a real HTML file with its own `<title>`, meta description and URL, sharing one
stylesheet and one script. The script reads `<body data-page="...">` and renders only that page.

## Features

- **Live filtering** on Gender, Department, Age Group and Education Field. Selections are held in
  `sessionStorage`, so filters carry across pages the way slicers do in Power BI.
- **Charts written from scratch** in SVG — pie, donut, horizontal bar, column and treemap — with
  hover tooltips. No Chart.js, no D3.
- **Real data**: 1,470 employee records extracted from the `.pbix` data model.
- Responsive down to mobile, keyboard-focusable, reduced-motion respected.

## Data

Three tables from the Power BI model, joined into one flat record set:

| Table | Key fields |
|---|---|
| `Attrition1` | id, Age Group, Attrition, Department, Education, Education Field |
| `Employee` | Employee Number, Gender, Job Role, Age |
| `Performance` | id, Job Satisfaction, Monthly Income, Percent Salary Hike, Performance Rating, Work Life Balance |

`Employee` joins on `Employee Number = Attrition1[id]`. Only 1,042 of 1,470 ids match, so charts
using Gender or Job Role are computed on that matched subset — the same behaviour as the report.

### DAX measures, translated to JavaScript

| Measure | DAX | JS |
|---|---|---|
| Total Count | `COUNT(Attrition1[id])` | `rows.length` |
| Attrition Enp | `CALCULATE(COUNT(id), FILTER(Attrition1, Attrition="Yes"))` | `rows.filter(r => r.attrition === 'Yes').length` |
| Regular Emp | `CALCULATE(COUNT(id), FILTER(Attrition1, Attrition="NO"))` | `rows.length - left` |
| Attrition Rate | `[Attrition Enp] / [Total Count]` | `left / rows.length` |

## Structure

```
index.html
attrition.html
performance.html
salary.html
insights.html
action-plan.html
css/style.css     palette, layout, components
js/data.js        generated dataset (dictionary-encoded columns)
js/charts.js      SVG chart functions
js/app.js         filters, measures, per-page rendering
```

## Running it

Open `index.html` directly, or serve the folder so navigation behaves like a deployed site:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. It deploys to GitHub Pages as-is.

## Notes on the source report

Three figures on the original Insights page did not match the data model and were corrected here:

- Admin shows 0% attrition, not 13.44% — it holds only 3 employees.
- Female attrition (16.55%) is slightly higher than male (15.65%), not the reverse.
- The 18–25 age group sits at 35.77%, not 20.00%.

Overall attrition (16.12%), the department split, education levels and all job-role rates match
the report exactly.
