import { check, validationResult } from "express-validator";

const validateLoginData = [
  check("email")
    .notEmpty()
    .withMessage("Email is Required")
    .isEmail()
    .withMessage("Invalid Email Address"),

  check("password")
    .notEmpty()
    .withMessage("Password is Required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  (req, res, next) => {
    const results = validationResult(req);

    results.isEmpty() ? next() : res.status(422).send(results.errors);
  },
];

export default validateLoginData;
