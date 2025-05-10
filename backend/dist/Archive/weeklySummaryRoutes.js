"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const weeklySummaryController_js_1 = require("./weeklySummaryController.js");
const router = express_1.default.Router();
router.post('/', weeklySummaryController_js_1.getWeeklySummary);
exports.default = router;
