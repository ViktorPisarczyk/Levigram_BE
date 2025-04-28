import { check, validationResult } from "express-validator";

const sanitizeLogin = [
  check("email").trim().escape().normalizeEmail(),
  check("password").trim().escape(),

  (req, res, next) => {
    const result = validationResult(req);
    result.isEmpty() ? next() : res.send({ errors: result });
  },
];

export default sanitizeLogin;