import { Router } from "express";
import {
  subscribe,
  unsubscribe,
  broadcast,
} from "../controllers/pushController.js";
import { protect } from "../middlewares/auth.js";

export const pushRouter = Router();

pushRouter.use(protect);

pushRouter.route("/subscribe").post(subscribe);
pushRouter.route("/unsubscribe").post(unsubscribe);
pushRouter.route("/broadcast").post(broadcast);
