// Convert grade points to letter grade
export const getLetterGrade = (gradePoints) => {
  if (gradePoints >= 9.0) return 'A+';
  if (gradePoints >= 8.0) return 'A';
  if (gradePoints >= 7.0) return 'B+';
  if (gradePoints >= 6.0) return 'B';
  if (gradePoints >= 5.0) return 'C+';
  if (gradePoints >= 4.0) return 'C';
  return 'F';
};

// Generate SGPA Line Chart (Performance Chart)
export const generatePerformanceChart = (sgpaBySemester) => {
  const sgpaData = [...sgpaBySemester].sort((a, b) => a.semester - b.semester);

  if (sgpaData.length === 0) return '';

  const width = 800;
  const height = 400;
  const padding = 50;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);
  const xStep = chartWidth / (sgpaData.length - 1 || 1);
  const yMax = 10;
  const yScale = chartHeight / yMax;

  const points = sgpaData.map((data, i) => {
    const x = padding + (i * xStep);
    const y = height - padding - (data.sgpa * yScale);
    return `${x},${y}`;
  }).join(' ');

  const xLabels = sgpaData.map((data, i) => {
    const x = padding + (i * xStep);
    return `
      <text x="${x}" y="${height - padding + 20}" text-anchor="middle" font-size="12">Sem ${data.semester}</text>
    `;
  }).join('');

  const yLabels = [];
  for (let i = 0; i <= 10; i += 2) {
    const y = height - padding - (i * yScale);
    yLabels.push(`
      <text x="${padding - 10}" y="${y}" text-anchor="end" alignment-baseline="middle" font-size="12">${i}</text>
      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e0e0e0" stroke-width="1" />
    `);
  }

  const dataPoints = sgpaData.map((data, i) => {
    const x = padding + (i * xStep);
    const y = height - padding - (data.sgpa * yScale);
    return `
      <circle cx="${x}" cy="${y}" r="5" fill="#4568dc" />
      <text x="${x}" y="${y - 15}" text-anchor="middle" font-size="12" fill="#4568dc" font-weight="bold">${data.sgpa}</text>
    `;
  }).join('');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2" />
      ${yLabels.join('')}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2" />
      ${xLabels}
      <polyline points="${points}" fill="none" stroke="#4568dc" stroke-width="3" />
      ${dataPoints}
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="16" font-weight="bold">SGPA Performance Across Semesters</text>
      <text x="${padding - 35}" y="${height / 2}" text-anchor="middle" font-size="14" transform="rotate(-90 ${padding - 35} ${height / 2})">SGPA</text>
      <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="14">Semester</text>
    </svg>
  `;
};

// Generate Grade Distribution Chart
export const generateGradeDistributionChart = (semesterGrades) => {
  const gradeCount = {
    'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'F': 0
  };

  Object.values(semesterGrades).flat().forEach(grade => {
    const letter = getLetterGrade(grade.grade_points);
    gradeCount[letter]++;
  });

  const width = 500;
  const height = 400;
  const padding = 50;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);
  const barCount = Object.keys(gradeCount).length;
  const barWidth = chartWidth / barCount * 0.7;
  const barSpacing = chartWidth / barCount * 0.3;

  const maxCount = Math.max(...Object.values(gradeCount));
  const yScale = chartHeight / (maxCount || 1);

  const bars = Object.entries(gradeCount).map(([grade, count], i) => {
    const x = padding + (i * (barWidth + barSpacing));
    const barHeight = count * yScale;
    const y = height - padding - barHeight;

    let color;
    switch (grade) {
      case 'A+': color = '#4caf50'; break;
      case 'A': color = '#8bc34a'; break;
      case 'B+': color = '#cddc39'; break;
      case 'B': color = '#ffeb3b'; break;
      case 'C+': color = '#ffc107'; break;
      case 'C': color = '#ff9800'; break;
      case 'F': color = '#f44336'; break;
      default: color = '#9e9e9e';
    }

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" />
      <text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" font-size="12">${count}</text>
      <text x="${x + barWidth / 2}" y="${height - padding + 20}" text-anchor="middle" font-size="12">${grade}</text>
    `;
  }).join('');

  const yLabels = [];
  const yStep = Math.ceil(maxCount / 5);
  for (let i = 0; i <= maxCount; i += yStep) {
    const y = height - padding - (i * yScale);
    yLabels.push(`
      <text x="${padding - 10}" y="${y}" text-anchor="end" alignment-baseline="middle" font-size="12">${i}</text>
      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e0e0e0" stroke-width="1" />
    `);
  }

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2" />
      ${yLabels.join('')}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2" />
      ${bars}
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="16" font-weight="bold">Grade Distribution</text>
      <text x="${padding - 35}" y="${height / 2}" text-anchor="middle" font-size="14" transform="rotate(-90 ${padding - 35} ${height / 2})">Number of Courses</text>
    </svg>
  `;
};
