import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getSwaggerOptions = (PORT, BASE_URL) => ({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Secure Identity Service API",
      version: "1.0.0",
      description: `
### Secure Academic Identity Management System

This API provides **secure identity management** for academic institutions with:

🔐 **JWT Authentication System**
- Login with email/username + password
- HTTP-only cookie for refresh tokens (secure against XSS)
- Short-lived access tokens in response body
- Role-based access control (Student, Lecturer, Admin)

🔄 **Token Refresh Flow**
- Secure refresh token rotation
- Automatic session extension
- Server-side token invalidation on logout

👥 **User Management**
- NIC (National ID) based registration
- Multi-role user profiles (Student/User/Lecturer/Admin)
- Admin-controlled user lifecycle
- Profile self-service for users

🛡️ **Security Features**
- Password hashing with bcrypt
- CSRF protection for state-changing operations
- Rate limiting on auth endpoints
- Secure cookie attributes (HttpOnly, SameSite, Secure)

### User Roles
| Role      | Permissions                          |
|-----------|--------------------------------------|
| Student   | Basic profile access                 |
| User      | Extended permissions                 |
| Lecturer  | Student management capabilities      |
| Admin     | Full system access                   |

### Authentication Flow
1. POST /auth/login → Gets accessToken (body) + refreshToken (cookie)
2. Use accessToken in Authorization header
3. When expired, POST /auth/refresh → Gets new accessToken
4. POST /auth/logout → Invalidates refreshToken
      `,
      contact: {
        name: "API Support",
        email: "seprojectgroup123@gmail.com",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}${BASE_URL}`,
        description: "Development Server",
      },
      {
        url: `http://52.136.38.68:5000${BASE_URL}`,
        description: "Production Server",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "Login, token refresh, and logout endpoints",
      },
      {
        name: "Users",
        description: "User profile and account management",
      },
      {
        name: "Admin",
        description: "Administrative user operations",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description: "Refresh token stored in HttpOnly cookie",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Access token in Authorization header",
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../models/*.js"),
    path.join(__dirname, "../server.js"),
  ],
});
