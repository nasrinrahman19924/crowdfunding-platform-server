const { jwtVerify, createRemoteJWKSet } = require("jose");

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });
    }

    const { payload } = await jwtVerify(token, JWKS);

    if (!payload?.id || !payload?.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${role} role required.`,
      });
    }

    next();
  };
};

const requireSupporter = requireRole("supporter");
const requireCreator = requireRole("creator");
const requireAdmin = requireRole("admin");

module.exports = {
  requireAuth,
  requireSupporter,
  requireCreator,
  requireAdmin,
};
