export const calculateSGPA = (grades) => {
  let totalGradePoints = 0;
  let totalCredits = 0;

  grades.forEach(grade => {
    totalGradePoints += grade.grade_points * grade.credits;
    totalCredits += grade.credits;
  });

  return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
};

export const calculateEarnedCredits = (grades) => {
  return grades.reduce((total, grade) => {
    return total + (grade.grade_points >= 4.0 ? grade.credits : 0);
  }, 0);
};
