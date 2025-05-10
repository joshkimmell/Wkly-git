"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseRoleKey = exports.supabaseUrl = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
// Supabase configuration
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
exports.supabaseUrl = process.env.SUPABASE_URL || '';
exports.supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Ensure environment variables are set
if (!exports.supabaseUrl || !exports.supabaseRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key. Check your .env file.');
}
// Create and export the Supabase client
const supabase = (0, supabase_js_1.createClient)(exports.supabaseUrl, exports.supabaseRoleKey);
exports.default = supabase;
