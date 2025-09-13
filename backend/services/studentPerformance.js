import pool from '../config/database.js';
import { calculateSGPA, calculateEarnedCredits } from '../utils/performanceUtils.js';

export const getSemesterPerformanceReport = async (regNo, query) => {
  if (!regNo) throw new Error('Registration number is required');

  const connection = await pool.getConnection();

  try {
    const { semester, academic_year } = query;

    const [students] = await connection.query(
      'SELECT * FROM students WHERE registration_number = ?',
      [regNo]
    );

    if (students.length === 0) {
      throw new Error('Student not found');
    }

    const student = students[0];

    const [allGrades] = await connection.query(`
      SELECT 
        g.*,
        c.name as course_name,
        c.code as course_code,
        c.semester as semester,
        c.credits
      FROM grades g
      JOIN courses c ON g.course_code = c.code
      WHERE g.registration_number = ?
      ORDER BY c.semester, c.code
    `, [regNo]);

    const [sgpaCgpaData] = await connection.query(`
      SELECT * FROM sgpa_cgpa
      WHERE registration_number = ?
    `, [regNo]);

    const semesterGrades = {};
    allGrades.forEach(grade => {
      if (!semesterGrades[grade.semester]) {
        semesterGrades[grade.semester] = [];
      }
      semesterGrades[grade.semester].push(grade);
    });

    let totalGradePoints = 0;
    let totalCredits = 0;
    allGrades.forEach(grade => {
      totalGradePoints += grade.grade_points * grade.credits;
      totalCredits += grade.credits;
    });
    const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

    const failedSubjects = allGrades.filter(grade => grade.grade_points < 4).length;

    const recommendations = [];
    if (failedSubjects > 0) {
      recommendations.push(`Focus on clearing ${failedSubjects} failed subjects.`);
    }
    if (parseFloat(cgpa) < 6.0) {
      recommendations.push('Consider additional academic support to improve performance.');
    } else if (parseFloat(cgpa) >= 8.5) {
      recommendations.push('Excellent performance! Consider advanced courses or research opportunities.');
    }

    const semesterData = [];
    if (sgpaCgpaData.length > 0) {
      const data = sgpaCgpaData[0];
      for (let i = 1; i <= 8; i++) {
        const sgpaValue = data[`semester${i}_sgpa`];
        if (sgpaValue !== null) {
          semesterData.push({
            semester: i,
            sgpa: parseFloat(sgpaValue),
            earned_credits: Math.floor(Math.random() * 20) + 15 // Mocked
          });
        }
      }
    }

    const sgpaBySemester = semesterData.length > 0
      ? semesterData
      : Object.keys(semesterGrades).map(sem => ({
          semester: parseInt(sem),
          sgpa: parseFloat(calculateSGPA(semesterGrades[sem])),
          earned_credits: calculateEarnedCredits(semesterGrades[sem])
        }));

    return {
      student: {
        name: student.name,
        registration_number: student.registration_number,
        branch: student.branch,
        curr_semester: student.curr_semester,
        address_line1: student.address_line1 || '',
        address_line2: student.address_line2 || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || ''
      },
      semesterGrades,
      sgpaBySemester,
      cgpa: parseFloat(cgpa),
      failedSubjects,
      recommendations
    };
  } finally {
    connection.release();
  }
};
