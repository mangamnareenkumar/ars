import fetch from 'node-fetch';

export const getStudentSemesterPerformance = async (regNo) => {
  if (!regNo) throw new Error('Registration number is required');

  try {
    const response = await fetch(`http://localhost:5000/api/reports/semester-performance/${regNo}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || 'Failed to fetch semester performance data');
    }

    const data = await response.json();

    // Structure the response to match: { student, semesterGrades, cgpa, sgpaBySemester }
    return {
      student: data.student,
      semesterGrades: data.semesterGrades,
      cgpa: data.cgpa,
      sgpaBySemester: data.sgpaBySemester
    };

  } catch (error) {
    console.error(`Error fetching performance data for ${regNo}:`, error.message);
    throw error;
  }
};

// Handle fetching the data from Faculty Report Types. This contains all the functions that fetch data from api defined for each report type.
// For now only one function is added