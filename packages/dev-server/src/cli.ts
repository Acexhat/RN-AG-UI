#!/usr/bin/env node
import { createDevServer } from "./server"

const port = parseInt(process.env["PORT"] ?? "4000", 10)
const scenario = process.env["SCENARIO"] ?? "greeting"

createDevServer({ port, scenario }).listen()
