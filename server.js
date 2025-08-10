import dotenv from "dotenv";
dotenv.config();
import path from "path";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import rootRoute from "./routes/root.js";
import swaggerJsDoc from "swagger-jsdoc";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import basicAuth from "express-basic-auth";
import { logger } from "./middleware/logger.js";
import corsOptions from "./config/corsOptions.js";
import connectMongoDb from "./config/dbConnection.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import { getSwaggerOptions } from "./config/swaggerConfig.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import studentRoutes from "./routes/student.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const BASE_URL = process.env.API_BASE_URL || "/api/v1";

connectMongoDb();

const swaggerDocs = swaggerJsDoc(getSwaggerOptions(PORT, BASE_URL));

const swaggerAuth = basicAuth({
  users: { admin: "admin123" },
  challenge: true,
});

if (
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_SWAGGER === "true"
) {
  app.use(
    `${BASE_URL}/docs`,
    swaggerAuth,
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs)
  );
}

// Middleware
app.use(logger);
app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

app.use("/", express.static(path.join(__dirname, "public")));
app.use("/", rootRoute);

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         message:
 *           type: string
 *           example: API is running
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Check if API is running
 *     tags: [API Status]
 *     responses:
 *       200:
 *         description: API status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
app.get(`${BASE_URL}`, (req, res) => {
  res.json({
    status: "success",
    message: "API is running",
  });
});

// Endpoints
app.use(`${BASE_URL}/auth`, authRoutes);
app.use(`${BASE_URL}/users`, userRoutes);
app.use(`${BASE_URL}/student`, studentRoutes);
app.use(`${BASE_URL}/attendance`, attendanceRoutes);

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Fund");
  }
});

// Error handling middleware
app.use(errorMiddleware);

// Server setup

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API base URL: ${BASE_URL}`);
  console.log(`Swagger docs available at: ${BASE_URL}/docs`);
});
