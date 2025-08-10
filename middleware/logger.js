import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { promises as fsPromises } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logEvents = async (message, logFileName) => {
  const dateTime = format(new Date(), "yyyy-MM-dd\tHH:mm:ss");
  const logItem = `${dateTime}\t${uuidv4()}\t${message}\n`;

  try {
    const logsDir = path.join(__dirname, "..", "logs");

    if (!fs.existsSync(logsDir)) {
      await fsPromises.mkdir(logsDir, { recursive: true });
    }

    await fsPromises.appendFile(path.join(logsDir, logFileName), logItem);
  } catch (error) {
    console.error("Failed to log event:", error);
  }
};

const logger = (req, res, next) => {
  const logMessage = [
    req.method,
    req.url,
    req.headers.origin || req.get("referer") || "direct-access",
    req.ip || req.connection.remoteAddress,
    req.get("user-agent") || "unknown",
  ].join("\t");

  logEvents(logMessage, "reqLog.log").catch((err) => {
    console.error("Logging failed:", err);
  });

  next();
};

export { logger, logEvents };
