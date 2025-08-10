import dotenv from "dotenv";
dotenv.config();
import connectMongoDb from "./config/dbConnection.js";
import User from "./models/user.model.js";

const testUsers = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@ananda.edu",
    nic: "123456789V",
    phone: "+94 11 234 5678",
    password: "password",
    role: "admin",
  },
  {
    firstName: "Warden",
    lastName: "Kumar",
    email: "warden@ananda.edu",
    nic: "987654321V",
    phone: "+94 11 234 5679",
    password: "password",
    role: "warden",
  },
  {
    firstName: "Accountant",
    lastName: "Sharma",
    email: "accounts@ananda.edu",
    nic: "456789123V",
    phone: "+94 11 234 5680",
    password: "password",
    role: "accountant",
  },
  {
    firstName: "Kitchen",
    lastName: "Manager",
    email: "kitchen@ananda.edu",
    nic: "789123456V",
    phone: "+94 11 234 5681",
    password: "password",
    role: "kitchen",
  },
];

const seedUsers = async () => {
  try {
    await connectMongoDb();

    // Clear existing users
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Create test users
    const createdUsers = await User.create(testUsers);
    console.log(`Created ${createdUsers.length} test users:`);

    createdUsers.forEach((user) => {
      console.log(
        `- ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`
      );
    });

    console.log("\nTest users created successfully!");
    console.log("You can now login with any of these credentials:");
    console.log("Password for all users: password");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
