"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.supabaseRoleKey = exports.supabaseUrl = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv = require("dotenv");
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
exports.supabase = (0, supabase_js_1.createClient)(exports.supabaseUrl, exports.supabaseRoleKey);
