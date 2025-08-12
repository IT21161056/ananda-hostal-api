import asyncHandler from "express-async-handler";
import Student from "../models/student.model.js";

/**
 * @desc    Create a new student
 * @route   POST /api/students
 * @access  Private/Admin
 */

const createStudent = asyncHandler(async (req, res) => {
  const {
    admissionNumber,
    name,
    admissionDate,
    dateOfBirth,
    bloodGroup,
    dorm,
    contact,
    class: studentClass,
    father,
    mother,
    guardian,
    numberOfSiblings,
    isActive,
  } = req.body;

  // Required field validation
  const requiredFields = [
    "admissionNumber",
    "name",
    "admissionDate",
    "dateOfBirth",
    "contact",
    "class",
  ];
  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    res.status(400);
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // Validate contact sub-fields
  if (!contact.address || !contact.district || !contact.province) {
    res.status(400);
    throw new Error("Contact address, district and province are required");
  }

  // Check if admission number exists
  const existingStudent = await Student.findOne({ admissionNumber });
  if (existingStudent) {
    res.status(400);
    throw new Error("Admission number already exists");
  }

  // Build student object with proper nested structures
  const studentData = {
    admissionNumber,
    name,
    admissionDate,
    dateOfBirth,
    contact: {
      phone: contact.phone || "",
      address: contact.address,
      district: contact.district,
      province: contact.province,
    },
    class: studentClass,
    isActive: isActive !== undefined ? isActive : true,
  };

  // Add optional fields if they exist
  if (bloodGroup) studentData.bloodGroup = bloodGroup;
  if (dorm) studentData.dorm = dorm;
  if (numberOfSiblings) studentData.numberOfSiblings = numberOfSiblings;

  // Handle father details
  if (father) {
    studentData.father = {
      name: father.name || "",
      occupation: father.occupation || "",
      employmentType: father.employmentType || "Other",
      monthlyIncome: father.monthlyIncome || 0,
      mobile: father.mobile || "",
    };
  }

  // Handle mother details
  if (mother) {
    studentData.mother = {
      name: mother.name || "",
      occupation: mother.occupation || "",
      employmentType: mother.employmentType || "Other",
      monthlyIncome: mother.monthlyIncome || 0,
      mobile: mother.mobile || "",
    };
  }

  // Handle guardian details
  if (guardian) {
    studentData.guardian = {
      name: guardian.name || "",
      occupation: guardian.occupation || "",
      address: guardian.address || "",
      phoneNumber: guardian.phoneNumber || "",
    };
  }

  const student = await Student.create(studentData);

  res.status(201).json({
    success: true,
    message: `Student ${student.name} created successfully`,
    data: {
      admissionNumber: student.admissionNumber,
      name: student.name,
      class: student.class,
      contact: student.contact,
      isActive: student.isActive,
      createdAt: student.createdAt,
    },
  });
});

/**
 * @desc    Get all students
 * @route   GET /api/students
 * @access  Private/Admin
 */
const getAllStudents = asyncHandler(async (req, res) => {
  const {
    search,
    admissionNumber,
    name,
    dorm,
    class: studentClass,
    isActive,
  } = req.query;
  let query = {};

  if (admissionNumber) {
    query.admissionNumber = admissionNumber;
  }

  if (name) {
    query.name = { $regex: new RegExp(name, "i") };
  }

  if (studentClass) {
    query.class = studentClass;
  }

  if (dorm) {
    query.dorm = dorm;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  if (search) {
    query.$or = [
      { name: { $regex: new RegExp(search, "i") } },
      { admissionNumber: isNaN(search) ? null : Number(search) },
      { "contact.phone": { $regex: new RegExp(search, "i") } },
    ].filter(Boolean); // Remove null values from OR conditions
  }

  const total = await Student.countDocuments({});
  const students = await Student.find(query).sort({ admissionNumber: 1 });

  res.status(200).json({
    total,
    data: students,
  });
});

/**
 * @desc    Get student by admission number
 * @route   GET /api/students/:admissionNumber
 * @access  Private/Admin
 */
const getStudentByAdmissionNumber = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    admissionNumber: req.params.admissionNumber,
  });

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  res.status(200).json({
    success: true,
    data: student,
  });
});

/**
 * @desc    Update student with proper nested object handling
 * @route   PUT /api/students/:id
 * @access  Private/Admin
 */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  console.log("id >>", id);

  const student = await Student.findById(id);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  // Update top-level fields
  const topLevelFields = [
    "name",
    "admissionNumber", // Now included in top-level fields
    "admissionDate",
    "dateOfBirth",
    "bloodGroup",
    "dorm",
    "class",
    "numberOfSiblings",
    "isActive",
  ];

  topLevelFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      // Convert admissionNumber to Number if it's being updated
      if (field === "admissionNumber") {
        student[field] = Number(updateData[field]);
      } else {
        student[field] = updateData[field];
      }
    }
  });

  // Update contact information
  if (updateData.contact) {
    student.contact = {
      ...student.contact,
      phone: updateData.contact.phone || student.contact.phone,
      address: updateData.contact.address || student.contact.address,
      district: updateData.contact.district || student.contact.district,
      province: updateData.contact.province || student.contact.province,
    };
  }

  // Update father information
  if (updateData.father) {
    student.father = student.father || {};
    student.father = {
      ...student.father,
      name: updateData.father.name || student.father.name || "",
      occupation:
        updateData.father.occupation || student.father.occupation || "",
      employmentType:
        updateData.father.employmentType ||
        student.father.employmentType ||
        "Other",
      monthlyIncome:
        updateData.father.monthlyIncome || student.father.monthlyIncome || 0,
      mobile: updateData.father.mobile || student.father.mobile || "",
    };
  }

  // Update mother information
  if (updateData.mother) {
    student.mother = student.mother || {};
    student.mother = {
      ...student.mother,
      name: updateData.mother.name || student.mother.name || "",
      occupation:
        updateData.mother.occupation || student.mother.occupation || "",
      employmentType:
        updateData.mother.employmentType ||
        student.mother.employmentType ||
        "Other",
      monthlyIncome:
        updateData.mother.monthlyIncome || student.mother.monthlyIncome || 0,
      mobile: updateData.mother.mobile || student.mother.mobile || "",
    };
  }

  // Update guardian information
  if (updateData.guardian) {
    student.guardian = student.guardian || {};
    student.guardian = {
      ...student.guardian,
      name: updateData.guardian.name || student.guardian.name || "",
      occupation:
        updateData.guardian.occupation || student.guardian.occupation || "",
      address: updateData.guardian.address || student.guardian.address || "",
      phoneNumber:
        updateData.guardian.phoneNumber || student.guardian.phoneNumber || "",
    };
  }

  const updatedStudent = await student.save();

  res.status(200).json({
    success: true,
    message: `Student ${updatedStudent.name} updated successfully`,
    data: updatedStudent,
  });
});

/**
 * @desc    Delete student
 * @route   DELETE /api/students/:admissionNumber
 * @access  Private/Admin
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const { admissionNumber } = req.params;

  const student = await Student.findOne({ admissionNumber });

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  await Student.deleteOne({ admissionNumber });

  res.status(200).json({
    success: true,
    message: `Student ${student.name} deleted successfully`,
  });
});

/**
 * @desc    Toggle student active status
 * @route   PATCH /api/students/:admissionNumber/status
 * @access  Private/Admin
 */
const toggleStudentStatus = asyncHandler(async (req, res) => {
  const { admissionNumber } = req.params;

  const student = await Student.findOne({ admissionNumber });

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  student.isActive = !student.isActive;
  await student.save();

  res.status(200).json({
    success: true,
    message: `Student ${student.name} status updated to ${
      student.isActive ? "active" : "inactive"
    }`,
    data: {
      admissionNumber: student.admissionNumber,
      name: student.name,
      isActive: student.isActive,
    },
  });
});

/**
 * @desc    Get students for attendance marking (filter by name and dorm)
 * @route   GET /api/students/attendance
 * @access  Private
 */
const getStudentsForAttendance = asyncHandler(async (req, res) => {
  const { name, dorm, search } = req.query;
  let query = { isActive: true }; // Only include active students

  // Add name filter if provided
  if (name) {
    query.name = { $regex: new RegExp(name, "i") };
  }

  // Add dorm filter if provided
  if (dorm) {
    query.dorm = dorm;
  }

  if (search) {
    query.$or = [
      { name: { $regex: new RegExp(search, "i") } },
      { admissionNumber: isNaN(search) ? null : Number(search) },
      { "contact.phone": { $regex: new RegExp(search, "i") } },
    ].filter(Boolean); // Remove null values from OR conditions
  }

  // Get only the required fields
  const students = await Student.find(query)
    .select("_id name dorm admissionNumber") // Include admissionNumber if needed
    .sort({ name: 1 });

  res.status(200).json({
    count: students.length,
    data: students.map((student) => ({
      id: student._id,
      name: student.name,
      dorm: student.dorm,
      admissionNumber: student.admissionNumber, // Include if needed for reference
    })),
  });
});

export {
  createStudent,
  getAllStudents,
  getStudentByAdmissionNumber,
  updateStudent,
  deleteStudent,
  toggleStudentStatus,
  getStudentsForAttendance,
};
