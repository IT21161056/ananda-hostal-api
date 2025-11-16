import dotenv from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";

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
import { attachIO } from "./middleware/socketMiddleware.js";
import { getSwaggerOptions } from "./config/swaggerConfig.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import studentRoutes from "./routes/student.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import mealplanRoutes from "./routes/mealplan.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import testRoutes from "./routes/test.routes.js";

// 🔹 Socket handler (central entry point)
import socketHandler from "./sockets/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your React app's URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});
app.use(attachIO(io));

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
app.use(`${BASE_URL}/mealplan`, mealplanRoutes);
app.use(`${BASE_URL}/inventory`, inventoryRoutes);
app.use(`${BASE_URL}/notification`, notificationRoutes);
app.use(`${BASE_URL}/dashboard`, dashboardRoutes);
app.use(`${BASE_URL}/test`, testRoutes);

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

// Error handling middleware
app.use(errorMiddleware);

// 🔹 Attach socket handlers
socketHandler(io);

// Server setup
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API base URL: ${BASE_URL}`);
  console.log(`Swagger docs available at: ${BASE_URL}/docs`);
});
