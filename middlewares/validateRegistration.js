import { check, validationResult } from "express-validator";

const validateRegistration = [
  check("username")
    .notEmpty()
    .withMessage("First Name is Required")
    .isLength({ min: 2, max: 20 })
    .withMessage("Username must be between 2 and 20 characters"),

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

  check("passwordConfirm")
    .notEmpty()
    .withMessage("Password confirmation is Required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .custom((value, { req }) => {
      if (value == req.body.password) {
        return true;
      }
      throw new Error("Passwords do not match");
    }),

  (req, res, next) => {
    const results = validationResult(req);

    results.isEmpty() ? next() : res.status(422).send(results.errors);
  },
];

export default validateRegistration;