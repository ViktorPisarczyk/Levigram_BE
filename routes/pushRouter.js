import { Router } from "express";
import {
  subscribe,
  unsubscribe,
  broadcast,
} from "../controllers/pushController.js";

export const pushRouter = Router();

pushRouter.route("/subscribe").post(subscribe);
pushRouter.route("/unsubscribe").post(unsubscribe);
pushRouter.route("/broadcast").post(broadcast);
