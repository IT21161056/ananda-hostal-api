export const attachIO = (io) => {
    return (req, res, next) => {
      req.io = io;
      next();
    };
  };