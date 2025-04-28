export const notFound = (req, res) => {
    res.status(404).send({ message: "Sorry, page not found" });
  };
  
  export const errorHandler = (err, req, res, next) => {
    res.status(err.status || 500);
    res.send({ message: err.message });
  };