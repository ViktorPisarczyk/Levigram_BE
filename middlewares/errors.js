export const notFound = (req, res) => {
  res.status(404).send({ message: "Sorry, page not found" });
};

export const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.message);

  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred",
  });
};
