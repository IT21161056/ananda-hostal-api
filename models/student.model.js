import mongoose from "mongoose";
const { Schema, model } = mongoose;

const studentSchema = new Schema(
  {
    // Basic Student Information
    admissionNumber: {
      type: Number,
      required: [true, "Admission number is required"],
      unique: true,
      min: [1, "Admission number must be positive"],
    },
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    admissionDate: {
      type: String,
      required: [true, "Admission date is required"],
    },
    dateOfBirth: {
      type: String,
      required: [true, "Date of birth is required"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    dorm: { type: String, required: [true, "Dorm is required"] },

    // Contact Information
    contact: {
      phone: {
        type: String,
        trim: true,
        validate: {
          validator: function (phone) {
            return !phone || /^\d{10}$/.test(phone.replace(/[\s\-\(\)]/g, ""));
          },
          message: "Phone number must be 10 digits",
        },
      },
      address: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
        maxLength: [200, "Address cannot exceed 200 characters"],
      },
      district: {
        type: String,
        required: [true, "District is required"],
        trim: true,
      },
      province: {
        type: String,
        required: [true, "Province is required"],
        trim: true,
      },
    },

    class: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
    },

    // Father Information
    father: {
      name: {
        type: String,
        trim: true,
      },
      occupation: {
        type: String,
        trim: true,
        maxLength: [100, "Father's occupation cannot exceed 100 characters"],
      },
      employmentType: {
        type: String,
        enum: {
          values: [
            "Government",
            "Private",
            "Self-employed",
            "Unemployed",
            "Other",
          ],
          message: "Invalid employment type for father",
        },
      },
      monthlyIncome: {
        type: Number,
        min: [0, "Father's monthly income cannot be negative"],
      },
      mobile: {
        type: String,
        trim: true,
        validate: {
          validator: function (mobile) {
            return (
              !mobile || /^\d{10}$/.test(mobile.replace(/[\s\-\(\)]/g, ""))
            );
          },
          message: "Father's mobile number must be 10 digits",
        },
      },
    },

    // Mother Information
    mother: {
      name: {
        type: String,
        trim: true,
        maxLength: [100, "Mother's name cannot exceed 100 characters"],
      },
      occupation: {
        type: String,
        trim: true,
        maxLength: [100, "Mother's occupation cannot exceed 100 characters"],
      },
      employmentType: {
        type: String,
        enum: {
          values: [
            "Government",
            "Private",
            "Self-employed",
            "Unemployed",
            "Other",
          ],
          message: "Invalid employment type for mother",
        },
      },
      monthlyIncome: {
        type: Number,
        min: [0, "Mother's monthly income cannot be negative"],
      },
      mobile: {
        type: String,
        trim: true,
        validate: {
          validator: function (mobile) {
            return (
              !mobile || /^\d{10}$/.test(mobile.replace(/[\s\-\(\)]/g, ""))
            );
          },
          message: "Mother's mobile number must be 10 digits",
        },
      },
    },

    // Guardian Information (optional)
    guardian: {
      name: {
        type: String,
        trim: true,
        maxLength: [100, "Guardian's name cannot exceed 100 characters"],
      },
      occupation: {
        type: String,
        trim: true,
        maxLength: [100, "Guardian's occupation cannot exceed 100 characters"],
      },
      address: {
        type: String,
        trim: true,
        maxLength: [200, "Guardian's address cannot exceed 200 characters"],
      },
      phoneNumber: {
        type: String,
        trim: true,
        validate: {
          validator: function (phone) {
            return !phone || /^\d{10}$/.test(phone.replace(/[\s\-\(\)]/g, ""));
          },
          message: "Guardian's phone number must be 10 digits",
        },
      },
    },

    // Family Information
    numberOfSiblings: {
      type: Number,
      default: 0,
      min: [0, "Number of siblings cannot be negative"],
      max: [20, "Number of siblings seems unrealistic"],
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// // Indexes for better query performance
// studentSchema.index({ admissionNumber: 1 });
// studentSchema.index({ name: 1 });
// studentSchema.index({ "academic.grade": 1, "academic.class": 1 });
// studentSchema.index({ admissionDate: 1 });

// // Virtual for full name (if needed)
// studentSchema.virtual("displayName").get(function () {
//   return this.name;
// });

// // Virtual for age calculation
// studentSchema.virtual("age").get(function () {
//   if (!this.dateOfBirth) return null;
//   const today = new Date();
//   const birthDate = new Date(this.dateOfBirth);
//   let age = today.getFullYear() - birthDate.getFullYear();
//   const monthDiff = today.getMonth() - birthDate.getMonth();

//   if (
//     monthDiff < 0 ||
//     (monthDiff === 0 && today.getDate() < birthDate.getDate())
//   ) {
//     age--;
//   }

//   return age;
// });

// // Pre-save middleware for data cleanup
// studentSchema.pre("save", function (next) {
//   // Ensure admission date is not in the future
//   if (this.admissionDate && this.admissionDate > new Date()) {
//     return next(new Error("Admission date cannot be in the future"));
//   }

//   // Convert income strings to numbers if they exist and are valid
//   if (
//     this.father.monthlyIncome &&
//     typeof this.father.monthlyIncome === "string"
//   ) {
//     const income = parseFloat(this.father.monthlyIncome);
//     this.father.monthlyIncome = isNaN(income) ? undefined : income;
//   }

//   if (
//     this.mother.monthlyIncome &&
//     typeof this.mother.monthlyIncome === "string"
//   ) {
//     const income = parseFloat(this.mother.monthlyIncome);
//     this.mother.monthlyIncome = isNaN(income) ? undefined : income;
//   }

//   next();
// });

// // Instance methods
// studentSchema.methods.getFullInfo = function () {
//   return {
//     admissionNumber: this.admissionNumber,
//     name: this.name,
//     age: this.age,
//     grade: this.academic.grade,
//     class: this.academic.class,
//     contact: this.contact,
//   };
// };

// // Static methods
// studentSchema.statics.findByGrade = function (grade) {
//   return this.find({ "academic.grade": grade, isActive: true });
// };

// studentSchema.statics.findByClass = function (grade, className) {
//   return this.find({
//     "academic.grade": grade,
//     "academic.class": className,
//     isActive: true,
//   });
// };

export default model("Student", studentSchema);
