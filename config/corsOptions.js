import allowedOrigins from "./allowedOrigins.js";

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const originAllowed = allowedOrigins.some(
      (allowedOrigin) => origin.toLowerCase() === allowedOrigin.toLowerCase()
    );

    if (originAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
};

export default corsOptions;
